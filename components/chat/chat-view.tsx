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
import { sendMessage, loadMessages, revealMessage, deleteMessage } from '@/lib/supabase/messages'
import { getCurrentUser } from '@/lib/supabase/auth'

interface ChatViewProps {
  user: User
  onBack: () => void
}

export function ChatView({ user, onBack }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [showProfile, setShowProfile] = useState(false)
  const [currentUserData, setCurrentUserData] = useState<CurrentUser | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const storageKey = `phantom-messages-${user.id}`
  const isTutorialBot = user.id === TUTORIAL_BOT_ID

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
      const userData = await getCurrentUser()
      setCurrentUserData(userData)
    }
    loadCurrentUser()
  }, [])

  useEffect(() => {
    // Load messages
    const loadMessagesData = async () => {
      // Tutorial bot uses its own message system
      if (isTutorialBot) {
        try {
          const saved = localStorage.getItem(storageKey)
          if (saved) {
            setMessages(JSON.parse(saved))
          } else {
            setMessages(mockMessages[user.id] || [])
          }
        } catch {
          setMessages(mockMessages[user.id] || [])
        }
        handleConversationOpened()
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

  // Polling: verificar novas mensagens a cada 3 segundos
  useEffect(() => {
    if (isTutorialBot || !currentUserData?.id) return

    const interval = setInterval(async () => {
      const { data, error } = await loadMessages(currentUserData.id, user.id)

      if (data && !error) {
        // Processar mensagens (suas reveladas, outras com estado original)
        const processedMessages = data.map(msg => ({
          ...msg,
          isRevealed: msg.senderId === currentUserData.id ? true : msg.isRevealed
        }))

        // Só atualizar se houver mudança no número de mensagens
        setMessages(prev => {
          if (prev.length !== processedMessages.length) {
            console.log('🔄 Nova mensagem recebida!')
            return processedMessages
          }
          return prev
        })
      }
    }, 3000) // A cada 3 segundos

    return () => clearInterval(interval)
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

  const handleSend = async (content: string, expiresIn?: number) => {
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
      type: 'text',
      expiresIn: expiresIn || 10,
    })

    if (data && !error) {
      // Add to local state - forçar revelada para quem enviou
      const messageWithRevealed = { ...data, isRevealed: true }
      setMessages((prev) => [...prev, messageWithRevealed])
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

  const handleSendPhoto = (photoData: string, mentions: string[], expiresIn?: number) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      content: '[Foto]',
      senderId: 'current-user',
      receiverId: user.id,
      timestamp: new Date(),
      isRead: false,
      isRevealed: true,
      expiresIn: expiresIn,
      type: 'image',
      imageUrl: photoData,
      allowedNicknames: mentions,
    }
    setMessages((prev) => [...prev, newMessage])
  }

  const handleReveal = async (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, isRevealed: true, isRead: true } : msg
      )
    )

    // Notify tutorial if this is the tutorial bot
    if (isTutorialBot) {
      handleMessageRevealed(messageId)
      return
    }

    // Update in Supabase for regular users
    if (currentUserData?.id) {
      await revealMessage(messageId)
    }
  }

  const handleExpire = async (messageId: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId))

    // Notify tutorial if this is the tutorial bot
    if (isTutorialBot) {
      handleMessageExpired(messageId)
      return
    }

    // Delete from Supabase for regular users
    if (currentUserData?.id) {
      await deleteMessage(messageId)
    }
  }

  const handleRequestPhoto = (photoId: string) => {
    console.log('Solicitando acesso a foto:', photoId)
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <ChatHeader
        user={user}
        onBack={onBack}
        onViewProfile={() => setShowProfile(true)}
      />

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-2"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 80%, oklch(0.2 0.05 260 / 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, oklch(0.25 0.08 180 / 0.2) 0%, transparent 50%)
          `,
        }}
      >
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
              isOwn={message.senderId === 'current-user'}
              onReveal={handleReveal}
              onExpire={handleExpire}
              viewerNickname={currentUser.nickname}
            />
          ))
        )}
      </div>

      <MessageInput onSend={handleSend} onSendPhoto={handleSendPhoto} />

      <UserProfileView
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        user={user}
        onSendMessage={() => setShowProfile(false)}
        onRequestPhoto={handleRequestPhoto}
      />
    </div>
  )
}
