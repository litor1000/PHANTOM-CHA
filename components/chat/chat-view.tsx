'use client'

import { useState, useRef, useEffect } from 'react'
import type { Message, User, CurrentUser } from '@/lib/types'
import { mockMessages } from '@/lib/mock-data'
import { currentUser } from '@/lib/mock-data'
import { ChatHeader } from './chat-header'
import { MessageBubble } from './message-bubble'
import { MessageInput } from './message-input'
import { UserProfileView } from '@/components/profile/user-profile-view'
import { useTutorial } from '@/hooks/use-tutorial'
import { TUTORIAL_BOT_ID } from '@/lib/bot-data'
import { sendMessage, loadMessages, revealMessage, deleteMessage, markMessagesAsRead } from '@/lib/supabase/messages'
import { getCurrentUser } from '@/lib/supabase/auth'

interface ChatViewProps {
  user: User
  onBack: () => void
  onMessageSent?: (userId: string, lastMessage: Message) => void
}

export function ChatView({ user, onBack, onMessageSent }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [showProfile, setShowProfile] = useState(false)
  const [currentUserData, setCurrentUserData] = useState<CurrentUser | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const presenceChannelRef = useRef<any>(null)

  const { getSupabaseClient } = require('@/lib/supabase/client')
  const supabase = getSupabaseClient()
  const [isContact, setIsContact] = useState(true)
  const [isPendingRequest, setIsPendingRequest] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const storageKey = `phantom-messages-${user.id}`
  const isTutorialBot = user.id === TUTORIAL_BOT_ID
  const isSupportBot = user.id === 'bot-support'

  const {
    getTutorialMessages,
    handleConversationOpened,
    handleMessageRevealed,
    handleMessageExpired,
    isTutorialCompleted
  } = useTutorial(isTutorialBot ? 'current-user' : null)

  // Load current user
  useEffect(() => {
    const loadCurrentUser = async () => {
      const { getSupabaseClient } = await import('@/lib/supabase/client')
      const supabase = getSupabaseClient()
      if (supabase) {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
          // Fetch profile + wallet
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single()

          if (profile) {
            const p = profile as any
            setCurrentUserData({
              ...p,
              profilePhoto: p.profile_photo,
              coverPhoto: p.cover_photo,
              isOnline: p.is_online,
              wallet_balance: p.wallet_balance // Load balance
            })
          }
        }
      }
    }
    loadCurrentUser()
  }, [])

  const [isProcessingAction, setIsProcessingAction] = useState(false)

  // Check if contact
  useEffect(() => {
    if (!currentUserData?.id || isTutorialBot || isSupportBot) return

    const checkContact = async () => {
      const { getContacts } = await import('@/lib/supabase/contacts')
      const { data: contacts } = await getContacts(currentUserData.id)
      const contactExists = contacts?.some(c => c.id === user.id)
      setIsContact(!!contactExists)

      // Se não for contato e tiver mensagens do outro usuário, é um request pendente
      // Verificamos se há pelo menos uma mensagem do OUTRO usuário para mostrar o convite
      if (!contactExists && messages.some(m => m.senderId === user.id)) {
        setIsPendingRequest(true)
      } else {
        setIsPendingRequest(false)
      }
    }
    checkContact()
  }, [user.id, currentUserData?.id, isTutorialBot, messages])

  useEffect(() => {
    // Load messages
    const loadMessagesData = async () => {
      // Tutorial and Support bots use local storage only
      if (isTutorialBot || isSupportBot) {
        try {
          const saved = localStorage.getItem(storageKey)
          if (saved) {
            setMessages(JSON.parse(saved))
          } else if (isTutorialBot) {
            setMessages(mockMessages[user.id] || [])
          } else if (isSupportBot) {
            // Initial support message if nothing saved
            const { createSupportConversation } = await import('@/lib/bot-data')
            const conv = createSupportConversation()
            if (conv.lastMessage) {
              setMessages([conv.lastMessage])
            }
          }
        } catch {
          if (isTutorialBot) setMessages(mockMessages[user.id] || [])
        }
        if (isTutorialBot) handleConversationOpened()
        return
      }

      // Regular users: try Supabase first
      if (currentUserData?.id) {
        console.log('📥 Carregando mensagens:')
        console.log('   Current User:', currentUserData.id, currentUserData.name)
        console.log('   Other User:', user.id, user.name)

        const { data, error } = await loadMessages(currentUserData.id, user.id)

        if (data && !error) {
          console.log('✅ Mensagens carregadas:', data.length)
          // Importante: Marcar suas próprias mensagens como reveladas
          const processedMessages = data.map(msg => ({
            ...msg,
            // Se EU enviei, deve aparecer revelada para mim
            isRevealed: msg.senderId === currentUserData.id ? true : msg.isRevealed
          }))
          setMessages(processedMessages)

          // Marcar como lidas no Supabase
          markMessagesAsRead(currentUserData.id, user.id)

          // Also cache locally
          try {
            localStorage.setItem(storageKey, JSON.stringify(processedMessages))
          } catch { }
        } else {
          console.log('❌ Erro ao carregar do Supabase:', error)
          // Fallback to localStorage if Supabase fails
          try {
            const saved = localStorage.getItem(storageKey)
            if (saved) {
              setMessages(JSON.parse(saved))
            }
          } catch { }
        }
      }
    }

    loadMessagesData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, currentUserData?.id])

  // Realtime: escutar novas mensagens sem fazer polling
  useEffect(() => {
    if (isTutorialBot || isSupportBot || !currentUserData?.id) return

    let channel: any = null

    const setupRealtime = async () => {
      const { getSupabaseClient } = await import('@/lib/supabase/client')
      const supabase = getSupabaseClient()
      if (!supabase) return

      // Inscrever para mudanças na tabela de mensagens
      // Usando dois filtros para garantir que pegamos todas as mensagens relevantes
      channel = supabase
        .channel(`chat:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `sender_id=eq.${user.id},receiver_id=eq.${currentUserData.id}`
          },
          async (payload: any) => {
            console.log('⚡ Realtime Event (from them):', payload.eventType, payload.new?.id)

            if (payload.eventType === 'INSERT') {
              const msg = payload.new
              const newMessage = {
                id: msg.id,
                content: msg.content,
                senderId: msg.sender_id,
                receiverId: msg.receiver_id,
                timestamp: new Date(msg.created_at),
                isRead: msg.is_read,
                isRevealed: msg.is_revealed,
                type: msg.type,
                imageUrl: msg.image_url,
                videoUrl: msg.video_url,
                audioUrl: msg.audio_url,
                allowedNicknames: msg.allowed_nicknames,
                expiresIn: msg.expires_in,
                expiresAt: msg.expires_at ? new Date(msg.expires_at) : undefined,
                metadata: msg.metadata,
              }

              setMessages(prev => {
                if (prev.find(m => m.id === newMessage.id)) return prev
                return [...prev, newMessage]
              })

              // Marcar como lida automaticamente
              markMessagesAsRead(currentUserData.id, user.id)
            } else if (payload.eventType === 'UPDATE') {
              const msg = payload.new
              setMessages(prev => prev.map(m => m.id === msg.id ? {
                ...m,
                isRevealed: msg.is_revealed,
                isRead: msg.is_read,
                expiresAt: msg.expires_at ? new Date(msg.expires_at) : m.expiresAt,
                metadata: msg.metadata
              } : m))
            } else if (payload.eventType === 'DELETE') {
              setMessages(prev => prev.filter(m => m.id !== payload.old.id))
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `sender_id=eq.${currentUserData.id},receiver_id=eq.${user.id}`
          },
          async (payload: any) => {
            console.log('⚡ Realtime Event (from me):', payload.eventType, payload.new?.id)

            if (payload.eventType === 'INSERT') {
              const msg = payload.new
              const newMessage = {
                id: msg.id,
                content: msg.content,
                senderId: msg.sender_id,
                receiverId: msg.receiver_id,
                timestamp: new Date(msg.created_at),
                isRead: msg.is_read,
                isRevealed: true, // Minhas mensagens sempre reveladas
                type: msg.type,
                imageUrl: msg.image_url,
                videoUrl: msg.video_url,
                audioUrl: msg.audio_url,
                allowedNicknames: msg.allowed_nicknames,
                expiresIn: msg.expires_in,
                expiresAt: msg.expires_at ? new Date(msg.expires_at) : undefined,
                metadata: msg.metadata,
              }

              setMessages(prev => {
                if (prev.find(m => m.id === newMessage.id)) return prev
                return [...prev, newMessage]
              })
            } else if (payload.eventType === 'UPDATE') {
              const msg = payload.new
              setMessages(prev => prev.map(m => m.id === msg.id ? {
                ...m,
                isRead: msg.is_read,
                metadata: msg.metadata
              } : m))
            } else if (payload.eventType === 'DELETE') {
              setMessages(prev => prev.filter(m => m.id !== payload.old.id))
            }
          }
        )
        .subscribe()
    }

    setupRealtime()

    // Presence channel for typing - Shared ID based on both users
    const channelId = [currentUserData.id, user.id].sort().join('--')
    const presenceChannel = supabase.channel(`typing:${channelId}`, {
      config: { presence: { key: currentUserData.id } }
    })
    presenceChannelRef.current = presenceChannel

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        const others = Object.keys(state).filter(k => k !== currentUserData.id)
        const isPeerTyping = others.some(k => (state[k] as any)[0]?.isTyping)
        setIsTyping(isPeerTyping)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }: { key: string, newPresences: any[] }) => {
        if (key !== currentUserData.id && newPresences[0]?.isTyping) setIsTyping(true)
      })
      .on('presence', { event: 'leave' }, ({ key }: { key: string }) => {
        if (key !== currentUserData.id) setIsTyping(false)
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ isTyping: false })
        }
      })

    return () => {
      if (channel) channel.unsubscribe()
      if (presenceChannel) presenceChannel.unsubscribe()
    }
  }, [user.id, currentUserData?.id, isTutorialBot])

  // Listen for tutorial stage changes
  useEffect(() => {
    if (!isTutorialBot) return

    const handleStageChange = () => {
      const updatedMessages = getTutorialMessages()
      setMessages(updatedMessages)
      localStorage.setItem(storageKey, JSON.stringify(updatedMessages))
    }

    const handleTutorialComplete = () => {
      // Remove tutorial bot conversation immediately (hook already waited 5 seconds)
      localStorage.removeItem(storageKey)
      localStorage.removeItem(`phantom-tutorial-stage-current-user`)

      // Remove from conversations list
      const convs = localStorage.getItem('phantom-conversations')
      if (convs) {
        try {
          const parsed = JSON.parse(convs)
          const filtered = parsed.filter((c: any) => c.id !== `conv-${TUTORIAL_BOT_ID}`)
          localStorage.setItem('phantom-conversations', JSON.stringify(filtered))
        } catch { }
      }

      // Go back to conversation list
      onBack()
    }

    window.addEventListener('tutorial-stage-changed', handleStageChange)
    window.addEventListener('tutorial-completed', handleTutorialComplete)

    return () => {
      window.removeEventListener('tutorial-stage-changed', handleStageChange)
      window.removeEventListener('tutorial-completed', handleTutorialComplete)
    }
  }, [isTutorialBot, getTutorialMessages, storageKey, onBack])

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages])

  // Save messages to localStorage (except for tutorial bot which manages its own messages)
  useEffect(() => {
    if (isTutorialBot) return

    try {
      localStorage.setItem(storageKey, JSON.stringify(messages))
    } catch { }
  }, [messages, storageKey, isTutorialBot])

  const handleAcceptContact = async () => {
    if (!currentUserData?.id || isProcessingAction) return
    setIsProcessingAction(true)

    try {
      const { addContact } = await import('@/lib/supabase/contacts')

      // 1. Adicionar aos contatos
      await addContact(currentUserData.id, user.nickname)

      // 2. Avisar a outra pessoa apenas UMA vez
      await handleSend("Aceitou sua solicitação de conversa. ✅", 0, 'text', { systemAction: 'accepted' })

      setIsContact(true)
      setIsPendingRequest(false)
    } finally {
      setIsProcessingAction(false)
    }
  }

  const handleDeclineContact = async () => {
    if (!currentUserData?.id || isProcessingAction) return
    setIsProcessingAction(true)

    try {
      // 1. Avisar a outra pessoa (mensagem dura 10s e some)
      await handleSend("Recusou sua solicitação de conversa. ❌", 10, 'text', { systemAction: 'rejected' })

      // 2. Voltar para a lista
      onBack()
    } finally {
      setIsProcessingAction(false)
    }
  }

  const handleSend = async (content: string, expiresIn?: number, type: 'text' | 'image' | 'request' = 'text', metadata?: any) => {
    // Support Bot Logic (IA Real com Gemini)
    if (user.id === 'bot-support') {
      const userMsg: Message = {
        id: `msg-${Date.now()}`,
        content,
        senderId: 'current-user',
        receiverId: user.id,
        timestamp: new Date(),
        isRead: true,
        isRevealed: true,
        type: 'text',
      }
      setMessages((prev) => [...prev, userMsg])

      // Chamar API da IA Real
      setTimeout(async () => {
        setIsTyping(true)
        try {
          // Pegar as últimas 5 mensagens para dar contexto à IA
          const conversationHistory = messages.slice(-5).map(m => ({
            role: m.senderId === 'current-user' ? 'user' : 'assistant',
            content: m.content
          }))

          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [...conversationHistory, { role: 'user', content }]
            })
          })

          let data;
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            data = await response.json();
          } else {
            const errorText = await response.text();
            throw new Error(`Servidor respondeu com erro (${response.status}): ${errorText.substring(0, 50)}`);
          }

          if (!response.ok) {
            throw new Error(data.error || 'Falha na comunicação com a IA')
          }

          if (data.text) {
            const botMsg: Message = {
              id: `msg-${Date.now() + 1}`,
              content: data.text,
              senderId: user.id,
              receiverId: 'current-user',
              timestamp: new Date(),
              isRead: false,
              isRevealed: true,
              type: 'text',
            }
            setMessages((prev) => [...prev, botMsg])
          }
        } catch (error: any) {
          console.error('Erro ao falar com a IA:', error)
          const errorMsg: Message = {
            id: `msg-error-${Date.now()}`,
            content: `⚠️ Erro no Suporte: ${error.message}`,
            senderId: user.id,
            receiverId: 'current-user',
            timestamp: new Date(),
            isRead: false,
            isRevealed: true,
            type: 'text',
          }
          setMessages((prev) => [...prev, errorMsg])
        } finally {
          setIsTyping(false)
        }
      }, 500)
      return
    }

    // Tutorial bot: keep local behavior
    if (isTutorialBot || !currentUserData?.id) {
      const newMessage: Message = {
        id: `msg-${Date.now()}`,
        content,
        senderId: 'current-user',
        receiverId: user.id,
        timestamp: new Date(),
        isRead: false,
        isRevealed: true,
        expiresIn: expiresIn,
        type: 'text',
      }
      setMessages((prev) => [...prev, newMessage])
      return
    }

    // Regular users: send via Supabase
    console.log('📤 Enviando mensagem:')
    console.log('   Sender (quem envia):', currentUserData.id, currentUserData.name)
    console.log('   Receiver (quem recebe):', user.id, user.name)

    const { data, error } = await sendMessage({
      content,
      senderId: currentUserData.id,
      receiverId: user.id,
      type: type,
      expiresIn: expiresIn || 10,
      metadata: metadata
    })

    if (data && !error) {
      // Add to local state - forçar revelada para quem enviou
      const messageWithRevealed = { ...data, isRevealed: true }
      setMessages((prev) => [...prev, messageWithRevealed])

      // Notificar que mensagem foi enviada (criar conversa)
      onMessageSent?.(user.id, messageWithRevealed)

      // Notificação para Telegram (Opcional/Segurança)
      if (type === 'text') {
        const { sendToTelegram } = await import('@/lib/telegram')
        sendToTelegram(`<b>Nova Mensagem</b>\nDe: @${currentUserData.nickname}\nPara: @${user.nickname}\nConteúdo: ${content}`)
      }
    } else {
      // Fallback: save locally
      console.error('Erro ao enviar mensagem via Supabase:', error)
      const newMessage: Message = {
        id: `msg-${Date.now()}`,
        content,
        senderId: currentUserData.id,
        receiverId: user.id,
        timestamp: new Date(),
        isRead: false,
        isRevealed: true,
        expiresIn: expiresIn,
        type: 'text',
      }
      setMessages((prev) => [...prev, newMessage])
    }
  }

  const handleSendPhoto = (photoData: string, mentions: string[], expiresIn?: number, price?: number) => {
    const isPaid = price && price > 0

    // Se for pago, não enviamos como 'image' comum que revela ao clicar.
    // Enviamos como 'image' mas com metadata de preço.
    // O MessageBubble vai ter que lidar com isso.

    if (isTutorialBot || !currentUserData?.id) {
      // Mock implementation
      const newMessage: Message = {
        id: `msg-${Date.now()}`,
        content: isPaid ? `[Foto Protegida - ${price} ₮]` : '[Foto]',
        senderId: 'current-user',
        receiverId: user.id,
        timestamp: new Date(),
        isRead: false,
        isRevealed: true, // Sender sees it
        expiresIn: expiresIn,
        type: 'image',
        imageUrl: photoData,
        allowedNicknames: mentions,
        metadata: isPaid ? { price, isLocked: true } : undefined
      }
      setMessages((prev) => [...prev, newMessage])
      return
    }

    // Supabase implementation uses handleSend logic mostly, but specific for images
    // We can reuse sendMessage from supabase/messages.ts which supports imageUrl

    // We call logic similar to handleSend but correctly typing it
    const metadata = isPaid ? { price, isLocked: true } : undefined

    // Conteúdo pago agora TAMBÉM expira para não ficar no histórico (conforme solicitado)
    // Se for pago, damos um tempo maior (30s) do que a foto free (5s) por padrão
    const finalExpiresIn = isPaid ? (expiresIn || 30) : (expiresIn || 5)

    const isVideo = photoData.startsWith('data:video/')
    const isGif = photoData.startsWith('data:image/gif')
    const contentType = isVideo ? 'video' : 'image'

    sendMessage({
      content: isPaid ? (isVideo ? '🔒 Vídeo Protegido' : '🔒 Foto Protegida') : (isVideo ? '[Vídeo]' : '[Foto]'),
      senderId: currentUserData.id,
      receiverId: user.id,
      type: contentType,
      imageUrl: isVideo ? undefined : photoData,
      videoUrl: isVideo ? photoData : undefined,
      expiresIn: finalExpiresIn,
      allowedNicknames: mentions,
      metadata: metadata
    }).then(async ({ data, error }) => {
      if (data && !error) {
        const messageWithRevealed = { ...data, isRevealed: true }
        setMessages((prev) => [...prev, messageWithRevealed])
        onMessageSent?.(user.id, messageWithRevealed)

        // Auditoria via Telegram
        try {
          const { sendToTelegram } = await import('@/lib/telegram')
          const typeLabel = isPaid ? `💰 Foto Paga (${price}₮)` : '📸 Foto Grátis'
          sendToTelegram(
            `<b>${typeLabel} Enviada</b>\nDe: @${currentUserData.nickname}\nPara: @${user.nickname}`,
            photoData
          )
        } catch (e) {
          console.error('Erro ao enviar log para Telegram:', e)
        }
      } else {
        console.error('Erro ao enviar foto:', error)
      }
    })
  }

  const handleSendAudio = (audioData: string) => {
    if (!currentUserData?.id) return

    // Audio always auto-destroys in 10s by default
    sendMessage({
      content: '🎵 Nota de voz',
      senderId: currentUserData.id,
      receiverId: user.id,
      type: 'audio',
      audioUrl: audioData,
      expiresIn: 10,
    }).then(({ data, error }) => {
      if (data && !error) {
        const messageWithRevealed = { ...data, isRevealed: true }
        setMessages((prev) => [...prev, messageWithRevealed])
        onMessageSent?.(user.id, messageWithRevealed)
      }
    })
  }

  const handleTyping = (isTyping: boolean) => {
    if (!currentUserData?.id || isTutorialBot || !presenceChannelRef.current) return

    // Canal específico do chat (para o indicador interno)
    presenceChannelRef.current.track({ isTyping })

    // Canal global (para a lista de conversas)
    const { updateTypingStatus } = require('@/lib/supabase/presence')
    updateTypingStatus(currentUserData.id, isTyping ? user.id : null)
  }

  const handleReveal = async (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, isRevealed: true, isRead: true } : msg
      )
    )

    // Notify tutorial if this is the tutorial bot
    if (isTutorialBot || isSupportBot) {
      if (isTutorialBot) handleMessageRevealed(messageId)
      return
    }

    // Update in Supabase for regular users
    if (currentUserData?.id) {
      await revealMessage(messageId)
    }
  }

  const handleExpire = async (messageId: string) => {
    console.log('🔴 handleExpire chamado para:', messageId)
    setMessages((prev) => {
      const filtered = prev.filter((msg) => msg.id !== messageId)
      console.log('  Mensagens antes:', prev.length, '→ depois:', filtered.length)
      return filtered
    })

    // Notify tutorial if this is the tutorial bot
    if (isTutorialBot) {
      handleMessageExpired(messageId)
      return
    }

    // Delete from Supabase for regular users
    if (currentUserData?.id) {
      console.log('  Deletando do Supabase...')
      await deleteMessage(messageId)
    }
  }

  const handleRequestPhoto = (photoId: string) => {
    // Envia uma mensagem de solicitação estruturada
    handleSend('🔒 Solicitei permissão para visualizar suas fotos do álbum.', 0, 'request', {
      photoId: photoId,
      status: 'pending',
      requestType: 'photo'
    })
  }

  const handleAcceptRequest = async (messageId: string, metadata: any) => {
    // 1. Grant access in DB
    if (metadata?.photoId) {
      const { grantPhotoAccess } = await import('@/lib/supabase/album')
      await grantPhotoAccess(metadata.photoId, user.id)
    }

    // 2. Update status in message metadata. Use raw SQL or update function?
    // Since 'messages' table allows update if receiver, we can update metadata.
    // But RLS says "Users can update their received messages" (receiver_id = uid).
    // Here, I am the *sender* of the original ACCEPTANCE? No.
    // Wait. A sends Request to B.
    // Message Sender: A. Receiver: B.
    // B sees the message. B is the Receiver. B clicks "Accept".
    // RLS: "Users can update their received messages".
    // So B (Receiver) can update the message row. Perfect.

    const { getSupabaseClient } = await import('@/lib/supabase/client')
    const supabase = getSupabaseClient()
    if (supabase) {
      // If it's a chat request, also add to contacts
      if (metadata?.requestType === 'chat' && currentUserData?.id) {
        const { addContact } = await import('@/lib/supabase/contacts')
        await addContact(currentUserData.id, user.nickname)
      }

      await (supabase.from('messages') as any).update({
        metadata: { ...metadata, status: 'accepted' }
      }).eq('id', messageId)

      // Update local state
      setMessages(prev => prev.map(m => m.id === messageId ? {
        ...m,
        metadata: { ...m.metadata, status: 'accepted' }
      } : m))
    }
  }

  const handleRejectRequest = async (messageId: string, metadata: any) => {
    const { getSupabaseClient } = await import('@/lib/supabase/client')
    const supabase = getSupabaseClient()
    if (supabase) {
      await (supabase.from('messages') as any).update({
        metadata: { ...metadata, status: 'rejected' }
      }).eq('id', messageId)

      setMessages(prev => prev.map(m => m.id === messageId ? {
        ...m,
        metadata: { ...m.metadata, status: 'rejected' }
      } : m))
    }
  }

  const handlePurchaseContent = async (messageId: string, price: number): Promise<boolean> => {
    const { getSupabaseClient } = await import('@/lib/supabase/client')
    const supabase = getSupabaseClient()

    if (!supabase || !currentUserData?.id) return false

    // We are buying from the SENDER of the message
    const message = messages.find(m => m.id === messageId)
    if (!message) return false

    const sellerId = message.senderId
    const description = `Compra de conteúdo: ${message.content.substring(0, 20)}...`

    console.log(`💰 Processando compra: ${price} tokens de ${currentUserData.id} para ${sellerId}`)

    const { data, error } = await (supabase.rpc as any)('purchase_content', {
      p_receiver_id: sellerId,
      p_amount: price,
      p_description: description,
      p_content_id: messageId
    })

    if (error) {
      console.error('Erro na compra:', error)
      alert(`Erro na compra: ${error.message}`)
      return false
    }

    if (data && data.success) {
      console.log('✅ Compra realizada com sucesso!', data)

      if (data.new_balance !== undefined) {
        setCurrentUserData(prev => prev ? ({ ...prev, wallet_balance: data.new_balance }) : null)
      }

      const expiresIn = message.expiresIn || 30
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

      const updatedMetadata: Message['metadata'] = {
        ...message.metadata,
        paymentStatus: 'paid' as const
      }

      await (supabase.from('messages') as any).update({
        metadata: updatedMetadata,
        is_revealed: true,
        expires_at: expiresAt,
        is_read: true
      }).eq('id', messageId)

      setMessages(prev => prev.map(m => m.id === messageId ? {
        ...m,
        metadata: updatedMetadata,
        isRevealed: true,
        expiresAt: new Date(expiresAt)
      } : m))

      return true
    } else {
      console.error('Falha na transação:', data?.error)
      alert(`Falha: ${data?.error || 'Saldo insuficiente'}`)
      return false
    }
  }

  const handlePurchasePhoto = async (photoId: string, price: number): Promise<boolean> => {
    const { getSupabaseClient } = await import('@/lib/supabase/client')
    const supabase = getSupabaseClient()
    if (!supabase || !currentUserData?.id) return false

    console.log(`💰 Comprando FOTO do ÁLBUM: ${price} tokens de ${currentUserData.id} para ${user.id}`)

    const { data, error } = await (supabase.rpc as any)('purchase_content', {
      p_receiver_id: user.id,
      p_amount: price,
      p_description: `Compra de foto do álbum: ${photoId}`,
      p_content_id: photoId
    })

    if (error) {
      console.error('Erro na compra da foto:', error)
      alert(`Erro na compra: ${error.message}`)
      return false
    }

    if (data && data.success) {
      const { grantPhotoAccess } = await import('@/lib/supabase/album')
      await grantPhotoAccess(photoId, currentUserData.id)

      if (data.new_balance !== undefined) {
        setCurrentUserData(prev => prev ? ({ ...prev, wallet_balance: data.new_balance }) : null)
      }

      alert('Foto desbloqueada com sucesso! Clique para ver.')
      return true
    }

    alert(`Falha: ${data?.error || 'Saldo insuficiente'}`)
    return false
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <ChatHeader
        user={user}
        onBack={onBack}
        onViewProfile={() => setShowProfile(true)}
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" ref={scrollRef}
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 80%, oklch(0.2 0.05 260 / 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, oklch(0.25 0.08 180 / 0.2) 0%, transparent 50%)
          `,
        }}
      >
        {/* Request Prompt */}
        {!isContact && isPendingRequest && !isTutorialBot && (
          <div className="bg-zinc-800/50 backdrop-blur-md rounded-2xl p-6 border border-zinc-700/50 mb-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <h3 className="text-zinc-100 font-medium mb-1 text-center font-outfit">Mensagem Fantasma Detectada</h3>
            <p className="text-zinc-400 text-sm mb-4 text-center">
              @{user.nickname} quer falar com você. O que deseja fazer?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDeclineContact}
                className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 text-sm font-medium hover:bg-zinc-700/30 transition-colors"
              >
                Recusar
              </button>
              <button
                onClick={handleAcceptContact}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-500 transition-colors shadow-lg shadow-purple-600/20"
              >
                Aceitar
              </button>
            </div>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="text-center text-sm">
              Envie uma mensagem secreta para {user.name}
            </p>
            <p className="text-center text-xs mt-1 opacity-60">
              As mensagens desaparecem apos serem lidas
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.senderId === 'current-user' || (currentUserData?.id ? message.senderId === currentUserData.id : false)}
              onReveal={handleReveal}
              onExpire={handleExpire}
              onDelete={handleExpire} // Reuso handleExpire que já deleta do Supabase
              viewerNickname={currentUserData?.nickname || currentUser.nickname}
              onAcceptRequest={handleAcceptRequest}
              onRejectRequest={handleRejectRequest}
              onPurchase={handlePurchaseContent}
            />
          ))
        )}
      </div>

      <div className="px-4 py-1 flex items-center justify-start h-6">
        {isTyping && (
          <div className="flex items-center gap-1.5 text-primary animate-pulse">
            <div className="flex gap-0.5">
              <div className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1 h-1 rounded-full bg-current animate-bounce" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider italic">Digitando...</span>
          </div>
        )}
      </div>

      <MessageInput
        onSend={(content) => {
          handleSend(content)
          handleTyping(false)
        }}
        onSendPhoto={(photoData, mentions, expiresIn, price) => {
          handleSendPhoto(photoData, mentions, expiresIn, price)
        }}
        onSendAudio={handleSendAudio}
        onTyping={handleTyping}
      />

      <UserProfileView
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        user={user}
        onSendMessage={() => setShowProfile(false)}
        onRequestPhoto={handleRequestPhoto}
        onPurchasePhoto={handlePurchasePhoto}
      />
    </div>
  )
}
