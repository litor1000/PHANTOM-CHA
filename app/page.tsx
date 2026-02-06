'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { ConversationList } from '@/components/chat/conversation-list'
import { ChatView } from '@/components/chat/chat-view'
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow'
import { mockConversations, mockUsers } from '@/lib/mock-data'
import type { CurrentUser, Conversation, User, Message } from '@/lib/types'
import type { UserFormData } from '@/components/onboarding/auth-form-refactored'
import { getCurrentUser, updateUserProfile, searchUserByNickname } from '@/lib/supabase/auth'
import { uploadProfilePhoto, uploadCoverPhoto } from '@/lib/supabase/storage'
import { InstallPrompt } from '@/components/pwa/install-prompt'
import { setupPresence } from '@/lib/supabase/presence'
import { AnimatePresence, motion } from 'framer-motion'
import { BiometricLock } from '@/components/auth/biometric-lock'
import { Capacitor } from '@capacitor/core'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { MessageSquare, Compass, Wallet, User as UserIcon } from 'lucide-react'
import { DiscoverView } from '@/components/discover/discover-view'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SettingsSheet } from '@/components/settings/settings-sheet'
import { WalletView } from '@/components/wallet/wallet-view'
import { PhotoAlbum, type AlbumPhoto } from '@/components/profile/photo-album'

export default function Home() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [user, setUser] = useState<CurrentUser | null>(null)

  // Registrar Push Notifications quando o usuário estiver logado
  usePushNotifications(user?.id)
  const [isLoading, setIsLoading] = useState(true)
  const [isLocked, setIsLocked] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [contacts, setContacts] = useState<User[]>([])
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'chats' | 'discover' | 'wallet' | 'profile'>('chats')
  const [showSettings, setShowSettings] = useState(false)
  const [showWallet, setShowWallet] = useState(false)
  const [showAlbum, setShowAlbum] = useState(false)
  const [albumPhotos, setAlbumPhotos] = useState<AlbumPhoto[]>([])

  const selectedUser = mockUsers.find((u) => u.id === selectedUserId) ||
    conversations.find(c => c.user.id === selectedUserId)?.user ||
    contacts.find(c => c.id === selectedUserId)


  // Check for existing user session
  useEffect(() => {
    const loadUser = async () => {
      // Try to get user from Supabase first
      const supabaseUser = await getCurrentUser()

      if (supabaseUser) {
        setUser(supabaseUser)
        // Sync to localStorage to avoid flicker next time
        localStorage.setItem('phantom-user', JSON.stringify(supabaseUser))

        if (Capacitor.isNativePlatform()) setIsLocked(true)
        // Load user-specific contacts
        const savedContacts = localStorage.getItem(`phantom-contacts-${supabaseUser.id}`)
        if (savedContacts) {
          try {
            setContacts(JSON.parse(savedContacts))
          } catch { }
        }

        // Load album
        const { getUserAlbum } = await import('@/lib/supabase/album')
        const { data: albumData } = await getUserAlbum(supabaseUser.id)
        if (albumData) setAlbumPhotos(albumData)
      } else {
        // Fallback to localStorage only if Supabase fails
        const savedUser = localStorage.getItem('phantom-user')
        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser)
            setUser(parsedUser)
            if (Capacitor.isNativePlatform()) setIsLocked(true)
            // Load user-specific contacts
            const savedContacts = localStorage.getItem(`phantom-contacts-${parsedUser.id}`)
            if (savedContacts) {
              try {
                setContacts(JSON.parse(savedContacts))
              } catch { }
            }
          } catch {
            localStorage.removeItem('phantom-user')
          }
        }
      }

      // Load conversations
      const savedConvs = localStorage.getItem('phantom-conversations')
      if (savedConvs) {
        try {
          setConversations(JSON.parse(savedConvs))
        } catch { }
      } else {
        setConversations(mockConversations)
      }

      // Load contacts (specific to current user)
      // Contacts will be loaded after we know who the user is

      // Onboarding: create tutorial bot conversation on first access
      const onboarded = localStorage.getItem('phantom-onboarded')
      if (!onboarded) {
        const { TUTORIAL_BOT, TUTORIAL_BOT_ID, TUTORIAL_MESSAGES, createTutorialConversation } = await import('@/lib/bot-data')

        // Create initial tutorial message (just the greeting)
        const initialMessages = [
          { ...TUTORIAL_MESSAGES.greeting, timestamp: new Date() }
        ]

        try {
          localStorage.setItem(`phantom-messages-${TUTORIAL_BOT_ID}`, JSON.stringify(initialMessages))
        } catch { }

        const botConversation = createTutorialConversation()
        botConversation.unreadCount = 1
        botConversation.lastMessage = TUTORIAL_MESSAGES.greeting

        const newConvs = [botConversation]
        setConversations(newConvs)
        localStorage.setItem('phantom-conversations', JSON.stringify(newConvs))
        setContacts([TUTORIAL_BOT])
        // Tutorial bot contacts will be loaded per user later
        localStorage.setItem('phantom-onboarded', '1')
      }

      setIsLoading(false)

      // Listen for tutorial completion to update conversations list
      const handleTutorialComplete = () => {
        // Remove bot from conversations
        setConversations((prev) => {
          const filtered = prev.filter((c) => c.id !== `conv-bot-tutorial`)
          localStorage.setItem('phantom-conversations', JSON.stringify(filtered))
          return filtered
        })

        // Remove bot from contacts
        setContacts((prev) => {
          const filtered = prev.filter((contact) => contact.id !== 'bot-tutorial')
          // Will be saved per user in handleAddContact
          return filtered
        })
      }

      window.addEventListener('tutorial-completed', handleTutorialComplete)

      return () => {
        window.removeEventListener('tutorial-completed', handleTutorialComplete)
      }
    }

    loadUser()
  }, [])

  // Poll for new conversations and messages
  useEffect(() => {
    if (!user || !user.id || user.id === 'current-user') return

    const fetchConversations = async () => {
      const { getUserConversations } = await import('@/lib/supabase/messages')
      // @ts-ignore
      const { data, error } = await getUserConversations(user.id)

      if (data && !error) {
        setConversations(prev => {
          // Preserve tutorial bot if it exists
          const tutorial = prev.find(c => c.id === 'conv-bot-tutorial')

          // If we found new conversations, use them
          // We need to be careful not to cause infinite re-renders if data is "same"
          // ideally we'd compare deep equality, but focused on "updates"
          // For now, just setting it is fine as React handles some diffing, 
          // but if the object refs change, it re-renders. 
          // Given this is a prototype/fix, it's acceptable.

          if (tutorial) {
            // Filter out tutorial from fetched data if it somehow appeared (unlikely)
            const filteredData = data.filter((c: any) => c.id !== 'conv-bot-tutorial')
            return [tutorial, ...filteredData]
          }
          return data
        })
      }
    }

    // Initial fetch
    fetchConversations()

    // Realtime: escutar mudanças nas mensagens para atualizar a lista de conversas
    let channel: any = null

    const setupRealtime = async () => {
      const { getSupabaseClient } = await import('@/lib/supabase/client')
      const supabase = getSupabaseClient()
      if (!supabase) return

      channel = supabase
        .channel('public:messages_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            // Escutamos mensagens onde o usuário atual é remetente ou destinatário
            filter: `sender_id=eq.${user.id}`
          },
          () => fetchConversations()
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `receiver_id=eq.${user.id}`
          },
          () => fetchConversations()
        )
        .subscribe()
    }

    setupRealtime()

    return () => {
      if (channel) {
        channel.unsubscribe()
      }
    }
  }, [user?.id])

  // Reload contacts from Supabase on init and sync local contacts
  useEffect(() => {
    if (user?.id && user.id !== 'current-user') {
      const loadAndSyncContacts = async () => {
        const { getContacts, addContact } = await import('@/lib/supabase/contacts')

        // 1. Fetch current DB contacts
        const { data: dbContacts } = await getContacts(user.id)
        let finalContacts = dbContacts || []

        // 2. Check for local contacts (migration/sync)
        const localKey = `phantom-contacts-${user.id}`
        const localStr = localStorage.getItem(localKey)
        let localContacts: User[] = []
        if (localStr) {
          try {
            localContacts = JSON.parse(localStr)
          } catch (e) {
            console.error("Error parsing local contacts", e)
          }
        }

        // 3. If we have local contacts that are not in DB, sync them up
        if (localContacts.length > 0) {
          const dbNicknames = new Set(finalContacts.map(c => c.nickname.toLowerCase()))
          const missingInDb = localContacts.filter(c => !dbNicknames.has(c.nickname.toLowerCase()))

          if (missingInDb.length > 0) {
            console.log(`Syncing ${missingInDb.length} local contacts to Supabase...`)

            // Add them sequentially to ensure strict order/limits if needed
            for (const contact of missingInDb) {
              // We try to add by nickname. If the user doesn't exist in DB (was a mock user), 
              // this might fail, effectively filtering out invalid mock data.
              await addContact(user.id, contact.nickname)
            }

            // Refetch to get the updated list from DB source of truth
            const { data: refetched } = await getContacts(user.id)
            if (refetched) {
              finalContacts = refetched
            }
          }
        }

        // 4. Update state
        setContacts(finalContacts)
      }

      loadAndSyncContacts()
    }
  }, [user?.id])

  const handleOnboardingComplete = async (userData: UserFormData) => {
    const currentUserData = await getCurrentUser()

    if (currentUserData) {
      // Upload photos to Supabase if provided
      let profilePhotoUrl = userData.profilePhoto
      let coverPhotoUrl = userData.coverPhoto

      if (userData.profilePhoto && userData.profilePhoto.startsWith('data:')) {
        const uploadedUrl = await uploadProfilePhoto(currentUserData.id, userData.profilePhoto)
        if (uploadedUrl) profilePhotoUrl = uploadedUrl
      }

      if (userData.coverPhoto && userData.coverPhoto.startsWith('data:')) {
        const uploadedUrl = await uploadCoverPhoto(currentUserData.id, userData.coverPhoto)
        if (uploadedUrl) coverPhotoUrl = uploadedUrl
      }

      // Update user profile with photos
      await updateUserProfile(currentUserData.id, {
        ...currentUserData,
        profilePhoto: profilePhotoUrl ?? null,
        coverPhoto: coverPhotoUrl ?? undefined,
      })

      const newUser: CurrentUser = {
        ...currentUserData,
        profilePhoto: profilePhotoUrl ?? null,
        coverPhoto: coverPhotoUrl ?? undefined,
      }

      setUser(newUser)
      localStorage.setItem('phantom-user', JSON.stringify(newUser))
    } else {
      // Fallback to old behavior if Supabase fails
      const newUser: CurrentUser = {
        id: 'current-user',
        name: userData.name || 'Usuario',
        nickname: userData.nickname || 'usuario',
        email: userData.email,
        phone: userData.phone || '',
        avatar: userData.profilePhoto || '',
        profilePhoto: userData.profilePhoto ?? null,
        coverPhoto: userData.coverPhoto ?? undefined,
        isOnline: true,
      }
      setUser(newUser)
      localStorage.setItem('phantom-user', JSON.stringify(newUser))
    }

    // Also save to global phantom-users list for uniqueness check
    const storedUsersStr = localStorage.getItem('phantom-users')
    let storedUsers = []
    if (storedUsersStr) {
      try { storedUsers = JSON.parse(storedUsersStr) } catch { }
    }
    const newUserForList = {
      id: 'current-user',
      name: userData.name || 'Usuario',
      nickname: userData.nickname || 'usuario',
      email: userData.email,
    }
    if (!storedUsers.some((u: any) => u.nickname === newUserForList.nickname)) {
      storedUsers.push(newUserForList)
      localStorage.setItem('phantom-users', JSON.stringify(storedUsers))
    }
  }

  const handleUpdateUser = async (updatedUser: CurrentUser) => {
    setUser(updatedUser)
    localStorage.setItem('phantom-user', JSON.stringify(updatedUser))

    // Update in Supabase
    if (updatedUser.id) {
      await updateUserProfile(updatedUser.id, updatedUser)
    }
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('phantom-user')
    setSelectedUserId(null)
  }



  const handleCreateGroup = (name: string, members: string[]) => {
    const groupId = `group-${Date.now()}`
    const newGroup: Conversation = {
      id: groupId,
      user: {
        id: groupId,
        name: name,
        nickname: 'group',
        email: '',
        phone: '',
        avatar: '',
        isOnline: true
      },
      unreadCount: 0,
      isGroup: true,
      members: ['current-user'], // Creator is member
      pendingMembers: members, // Others are pending
      lastMessage: {
        id: `msg-${Date.now()}`,
        content: 'Grupo criado',
        senderId: 'system',
        receiverId: groupId,
        timestamp: new Date(),
        isRead: true,
        isRevealed: true,
        type: 'text'
      }
    }

    const newConvs = [newGroup, ...conversations]
    setConversations(newConvs)
    localStorage.setItem('phantom-conversations', JSON.stringify(newConvs))
  }

  const handleAcceptInvite = (groupId: string) => {
    const updatedConvs = conversations.map(c => {
      if (c.id === groupId) {
        return {
          ...c,
          members: [...(c.members || []), 'current-user'],
          pendingMembers: c.pendingMembers?.filter(id => id !== 'current-user')
        }
      }
      return c
    })
    setConversations(updatedConvs)
    localStorage.setItem('phantom-conversations', JSON.stringify(updatedConvs))
  }

  const handleRejectInvite = (groupId: string) => {
    const updatedConvs = conversations.map(c => {
      if (c.id === groupId) {
        return {
          ...c,
          pendingMembers: c.pendingMembers?.filter(id => id !== 'current-user')
        }
      }
      return c
    })
    setConversations(updatedConvs)
    localStorage.setItem('phantom-conversations', JSON.stringify(updatedConvs))
  }

  const handleMessageSent = (userId: string, lastMessage: Message) => {
    // Criar ou atualizar conversa quando mensagem é enviada
    const contactUser = contacts.find(c => c.id === userId) || selectedUser
    if (!contactUser) return

    setConversations(prev => {
      // Verificar se já existe conversa
      // Prevenir QuotaExceededError removendo dados pesados de imagem do resumo da conversa
      const lastMessageShort = {
        ...lastMessage,
        imageUrl: lastMessage.imageUrl?.startsWith('data:') ? '[Imagem]' : lastMessage.imageUrl
      }

      const existingIndex = prev.findIndex(c => c.user.id === userId)

      if (existingIndex >= 0) {
        // Atualizar conversa existente
        const updated = [...prev]
        updated[existingIndex] = {
          ...updated[existingIndex],
          lastMessage: lastMessageShort,
          unreadCount: updated[existingIndex].unreadCount
        }

        try {
          localStorage.setItem('phantom-conversations', JSON.stringify(updated))
        } catch (e) {
          console.warn('LocalStorage cheio, ignorando cache de conversas')
        }
        return updated
      } else {
        // Criar nova conversa
        const newConv: Conversation = {
          id: `conv-${userId}`,
          user: contactUser,
          lastMessage: lastMessageShort,
          unreadCount: 0,
          isGroup: false
        }
        const updated = [newConv, ...prev]
        try {
          localStorage.setItem('phantom-conversations', JSON.stringify(updated))
        } catch (e) {
          console.warn('LocalStorage cheio, ignorando cache de conversas')
        }
        return updated
      }
    })
  }

  // Delete conversation logic
  const handleDeleteConversation = (conversationId: string) => {
    setConversations(prev => {
      const updated = prev.filter(c => c.id !== conversationId)
      localStorage.setItem('phantom-conversations', JSON.stringify(updated))
      return updated
    })

    // If deleted active conversation, deselect
    if (selectedUserId) {
      const deletedConv = conversations.find(c => c.id === conversationId)
      if (deletedConv && deletedConv.user.id === selectedUserId) {
        setSelectedUserId(null)
      }
    }
  }

  const [typingToMe, setTypingToMe] = useState<string[]>([]) // IDs de quem está digitando para MIM

  // Presence Setup
  useEffect(() => {
    if (!user?.id || user.id === 'current-user') return

    const channel = setupPresence(user.id, user.isOnline ?? true, (state) => {
      // 1. Atualizar IDs Online
      const onlineIds = Object.keys(state).filter(id => id !== user.id)
      setOnlineUserIds(onlineIds)

      // 2. Identificar quem está digitando para MIM
      const typingIds: string[] = []
      Object.entries(state).forEach(([id, presences]: [string, any]) => {
        if (id === user.id) return
        const isTypingToMe = presences.some((p: any) => p.isTypingTo === user.id)
        if (isTypingToMe) {
          typingIds.push(id)
        }
      })
      setTypingToMe(typingIds)
    })

    return () => {
      if (channel) channel.unsubscribe()
    }
  }, [user?.id, user?.isOnline])

  // Update conversations and contacts online status
  const conversationsWithPresence = conversations.map(conv => ({
    ...conv,
    user: {
      ...conv.user,
      isOnline: onlineUserIds.includes(conv.user.id)
    }
  }))

  const contactsWithPresence = contacts.map(contact => ({
    ...contact,
    isOnline: onlineUserIds.includes(contact.id)
  }))

  const currentUserWithPresence = user ? {
    ...user,
    isOnline: true // Current user is obviously online
  } : null

  // Update handleAddContact to use Supabase
  const handleAddContact = async (nickname: string) => {
    if (!user?.id || user.id === 'current-user') return false

    const { addContact } = await import('@/lib/supabase/contacts')
    const { data: newContact, error } = await addContact(user.id, nickname)

    if (newContact) {
      setContacts(prev => [...prev, newContact])
      return true
    }

    return false
  }

  const handleChatSelect = (userId: string) => {
    setSelectedUserId(userId)
    // Clear unread count locally for immediate feedback
    setConversations(prev => prev.map(conv => {
      if (conv.user.id === userId) {
        return { ...conv, unreadCount: 0 }
      }
      return conv
    }))
  }

  if (isLoading) {
    return (
      <main className="h-dvh w-full flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  if (isLocked) {
    return <BiometricLock onAuthenticated={() => setIsLocked(false)} />
  }

  if (!user) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />
  }

  return (
    <main className="h-dvh w-full max-w-md mx-auto flex flex-col overflow-hidden shadow-2xl relative">
      {/* Background Image Layer */}
      <div className="absolute inset-0 -z-10 bg-zinc-950 pointer-events-none">
        <Image
          src="/images/onboarding-bg.png"
          alt=""
          fill
          className="object-cover opacity-20"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/40 via-background/20 to-background" />
      </div>

      <AnimatePresence>
        {selectedUserId && selectedUser ? (
          <motion.div
            key="chat-view"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 250 }}
            className="absolute inset-0 z-50 bg-background"
          >
            <ChatView
              user={selectedUser}
              onBack={() => setSelectedUserId(null)}
              onMessageSent={handleMessageSent}
            />
          </motion.div>
        ) : (
          <motion.div
            key="main-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-hidden"
          >
            {activeTab === 'chats' && (
              <ConversationList
                conversations={conversationsWithPresence}
                onSelectConversation={handleChatSelect}
                currentUser={currentUserWithPresence as CurrentUser}
                onUpdateUser={setUser}
                onLogout={handleLogout}
                contacts={contactsWithPresence}
                onAddContact={handleAddContact}
                onCreateGroup={handleCreateGroup}
                onAcceptInvite={handleAcceptInvite}
                onRejectInvite={handleRejectInvite}
                onDeleteConversation={handleDeleteConversation}
                typingUserIds={typingToMe}
                onOpenSettings={() => setShowSettings(true)}
                onOpenWallet={() => setShowWallet(true)}
              />
            )}
            {activeTab === 'discover' && (
              <DiscoverView
                onSelectUser={(userId) => {
                  setSelectedUserId(userId)
                }}
                currentUser={user as CurrentUser}
              />
            )}
            {activeTab === 'wallet' && (
              <div className="flex-1 h-full flex flex-col items-center justify-center text-muted-foreground p-10 text-center gap-4">
                <Wallet className="w-16 h-16 opacity-20" />
                <div className="space-y-2">
                  <h3 className="text-lg font-black uppercase tracking-widest text-foreground">Sua Carteira</h3>
                  <p className="text-sm">Acesse o painel financeiro para gerenciar seus tokens e saques.</p>
                </div>
                <Button onClick={() => setShowWallet(true)}>Abrir Carteira</Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar */}
      {!selectedUserId && (
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-background/80 backdrop-blur-xl border-t border-border/40 px-6 py-3 z-40 flex items-center justify-between pb-8">
          <BottomNavItem
            icon={MessageSquare}
            label="Chats"
            isActive={activeTab === 'chats'}
            onClick={() => setActiveTab('chats')}
            badge={conversations.some(c => c.unreadCount > 0) ? true : false}
          />
          <BottomNavItem
            icon={Compass}
            label="Descobrir"
            isActive={activeTab === 'discover'}
            onClick={() => setActiveTab('discover')}
          />
          <BottomNavItem
            icon={Wallet}
            label="Carteira"
            isActive={activeTab === 'wallet'}
            onClick={() => setShowWallet(true)}
          />
          <BottomNavItem
            icon={UserIcon}
            label="Perfil"
            isActive={activeTab === 'profile'}
            onClick={() => setShowSettings(true)}
          />
        </nav>
      )}

      {user && (
        <>
          <SettingsSheet
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            user={user as CurrentUser}
            onUpdateUser={setUser}
            onLogout={handleLogout}
            onOpenAlbum={() => {
              setShowSettings(false)
              setShowAlbum(true)
            }}
            onOpenWallet={() => {
              setShowSettings(false)
              setShowWallet(true)
            }}
          />

          <PhotoAlbum
            isOpen={showAlbum}
            onClose={() => setShowAlbum(false)}
            photos={albumPhotos}
            onUpdatePhotos={setAlbumPhotos}
            pendingRequests={[]} // For now empty, can be state later
            onApproveRequest={() => { }}
            onRejectRequest={() => { }}
            onUploadPhoto={async (file) => {
              const { uploadAlbumPhoto } = await import('@/lib/supabase/album')
              const { data } = await uploadAlbumPhoto(user.id, file)
              return data
            }}
            onDeletePhoto={async (photoId) => {
              const { deleteAlbumPhoto } = await import('@/lib/supabase/album')
              await deleteAlbumPhoto(photoId)
            }}
          />

          <WalletView
            isOpen={showWallet}
            onClose={() => setShowWallet(false)}
            currentUser={user as CurrentUser}
          />
        </>
      )}

      <InstallPrompt />
    </main>
  )
}

function BottomNavItem({
  icon: Icon,
  label,
  isActive,
  onClick,
  badge
}: {
  icon: any,
  label: string,
  isActive: boolean,
  onClick: () => void,
  badge?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-all relative active:scale-90",
        isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
      <div className={cn(
        "p-1.5 rounded-xl transition-all",
        isActive && "bg-primary/10"
      )}>
        <Icon className={cn("w-6 h-6", isActive && "fill-current")} />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
      {badge && (
        <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full border border-background animate-pulse" />
      )}
    </button>
  )
}
