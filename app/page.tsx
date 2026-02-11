'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { toast } from 'sonner'

export default function Home() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [user, setUser] = useState<CurrentUser | null>(null)

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

  const fetchConversations = useCallback(async () => {
    if (!user?.id || user.id === 'current-user') return
    const { getUserConversations } = await import('@/lib/supabase/messages')
    // @ts-ignore
    const { data, error } = await getUserConversations(user.id)

    if (data && !error) {
      setConversations(prev => {
        const tutorial = prev.find(c => c.id === 'conv-bot-tutorial')
        const support = prev.find(c => c.id === 'conv-bot-support')
        let finalData = data.filter((c: any) =>
          c.id !== 'conv-bot-tutorial' &&
          c.id !== 'conv-bot-support'
        )
        if (support) finalData = [support, ...finalData]
        if (tutorial) finalData = [tutorial, ...finalData]
        return finalData
      })
    }
  }, [user?.id])

  const fetchContacts = useCallback(async () => {
    if (!user?.id || user.id === 'current-user') return
    const { getContacts } = await import('@/lib/supabase/contacts')
    const { data: dbContacts } = await getContacts(user.id)
    if (dbContacts) {
      setContacts(dbContacts)
      localStorage.setItem(`phantom-contacts-${user.id}`, JSON.stringify(dbContacts))
    }
  }, [user?.id])

  // Check for existing user session
  useEffect(() => {
    const loadInitialData = async () => {
      // 1. Tentar carregamento imediato do localStorage para UX rápida
      const savedUser = localStorage.getItem('phantom-user')
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser)
          setUser(parsedUser)
          setIsLoading(false) // Esconde o spinner imediatamente se tivermos dados locais
        } catch (e) {
          localStorage.removeItem('phantom-user')
        }
      }

      // 2. Buscar dados frescos do servidor em paralelo
      try {
        const supabaseUser = await getCurrentUser()

        if (supabaseUser) {
          setUser(supabaseUser)
          localStorage.setItem('phantom-user', JSON.stringify(supabaseUser))

          // Buscar extras em paralelo sem bloquear a UI principal
          const [{ getUserAlbum }, { getContacts }, { getUserConversations }] = await Promise.all([
            import('@/lib/supabase/album'),
            import('@/lib/supabase/contacts'),
            import('@/lib/supabase/messages')
          ])

          // Disparar fetches mas não precisa travar tudo aqui se já tivermos o básico
          const [albumRes, contactsRes, convsRes] = await Promise.all([
            getUserAlbum(supabaseUser.id),
            getContacts(supabaseUser.id),
            getUserConversations(supabaseUser.id)
          ])

          if (albumRes.data) setAlbumPhotos(albumRes.data)
          if (contactsRes.data) {
            setContacts(contactsRes.data)
            localStorage.setItem(`phantom-contacts-${supabaseUser.id}`, JSON.stringify(contactsRes.data))
          }
          if (convsRes.data) {
            setConversations(prev => {
              const tutorial = prev.find(c => c.id === 'conv-bot-tutorial')
              const support = prev.find(c => c.id === 'conv-bot-support')
              let finalData = convsRes.data.filter((c: any) =>
                c.id !== 'conv-bot-tutorial' &&
                c.id !== 'conv-bot-support'
              )
              if (support) finalData = [support, ...finalData]
              if (tutorial) finalData = [tutorial, ...finalData]
              return finalData
            })
          }
        } else {
          setUser(null)
          localStorage.removeItem('phantom-user')
        }
      } catch (error) {
        console.error('Erro no carregamento inicial:', error)
      } finally {
        setIsLoading(false) // Garante que o spinner suma mesmo se houver erro
      }

      // Listen for events
      const handleTutorialComplete = () => {
        setConversations(prev => prev.filter(c => c.id !== `conv-bot-tutorial`))
        setContacts(prev => prev.filter(contact => contact.id !== 'bot-tutorial'))
      }
      window.addEventListener('tutorial-completed', handleTutorialComplete)

      const handleOpenSupport = async () => {
        const { createSupportConversation } = await import('@/lib/bot-data')
        const supportConv = createSupportConversation()
        setConversations(prev => [supportConv, ...prev.filter(c => c.id !== supportConv.id)])
        setSelectedUserId(supportConv.user.id)
        setActiveTab('chats')
      }
      window.addEventListener('open-support-chat', handleOpenSupport)

      return () => {
        window.removeEventListener('tutorial-completed', handleTutorialComplete)
        window.removeEventListener('open-support-chat', handleOpenSupport)
      }
    }
    loadInitialData()
  }, [])

  // Realtime and Poll
  useEffect(() => {
    if (!user || user.id === 'current-user') return

    const refreshAllData = () => {
      fetchConversations()
      fetchContacts()
    }

    refreshAllData()

    let msgChannel: any = null
    let blockChannel: any = null

    const setupRealtime = async () => {
      const { getSupabaseClient } = await import('@/lib/supabase/client')
      const supabase = getSupabaseClient()
      if (!supabase) return

      msgChannel = supabase
        .channel('public:messages_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
          fetchConversations()
        })
        .subscribe()

      blockChannel = supabase
        .channel('public:blocked_users_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'blocked_users' }, (payload: any) => {
          // Refresca se houver qualquer mudança nos bloqueios que envolva o usuário
          refreshAllData()

          if (payload.eventType === 'INSERT') {
            const b = payload.new
            const otherId = b.blocker_id === user.id ? b.blocked_id : b.blocker_id
            if (selectedUserId === otherId) {
              setSelectedUserId(null)
              toast.info('Essa conversa não está mais disponível.')
            }
          }
        })
        .subscribe()
    }

    setupRealtime()
    return () => {
      if (msgChannel) msgChannel.unsubscribe()
      if (blockChannel) blockChannel.unsubscribe()
    }
  }, [user?.id, selectedUserId, fetchConversations, fetchContacts])

  const handleOnboardingComplete = async (userData: UserFormData) => {
    const currentUserData = await getCurrentUser()
    if (currentUserData) {
      setUser(currentUserData)
      localStorage.setItem('phantom-user', JSON.stringify(currentUserData))
    }
  }

  const handleMessageSent = (userId: string, lastMessage: Message) => {
    fetchConversations()
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('phantom-user')
    setSelectedUserId(null)
  }

  const handleChatSelect = (userId: string) => {
    setSelectedUserId(userId)
    setConversations(prev => prev.map(conv => {
      if (conv.user.id === userId) return { ...conv, unreadCount: 0 }
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

  const conversationsWithPresence = conversations.map(conv => ({
    ...conv,
    user: { ...conv.user, isOnline: onlineUserIds.includes(conv.user.id) }
  }))

  const contactsWithPresence = contacts.map(contact => ({
    ...contact,
    isOnline: onlineUserIds.includes(contact.id)
  }))

  return (
    <main className="h-dvh w-full max-w-md mx-auto flex flex-col overflow-hidden shadow-2xl relative">
      <AnimatePresence>
        {selectedUserId && selectedUser ? (
          <motion.div
            key="chat-view"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            className="absolute inset-0 z-50 bg-background"
          >
            <ChatView
              user={selectedUser}
              onBack={() => setSelectedUserId(null)}
              onMessageSent={handleMessageSent}
            />
          </motion.div>
        ) : (
          <motion.div key="main-content" className="flex-1 overflow-hidden">
            {activeTab === 'chats' && (
              <ConversationList
                conversations={conversationsWithPresence}
                onSelectConversation={handleChatSelect}
                currentUser={user as CurrentUser}
                onUpdateUser={setUser}
                onLogout={handleLogout}
                contacts={contactsWithPresence}
                onAddContact={async (nick) => {
                  const { addContact } = await import('@/lib/supabase/contacts')
                  const { data } = await addContact(user.id, nick)
                  if (data) { setContacts(prev => [...prev, data]); return true; }
                  return false;
                }}
                onOpenSettings={() => setShowSettings(true)}
                onOpenWallet={() => setShowWallet(true)}
              />
            )}
            {activeTab === 'discover' && (
              <DiscoverView onSelectUser={(id) => setSelectedUserId(id)} currentUser={user as CurrentUser} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!selectedUserId && (
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-background/80 backdrop-blur-xl border-t border-border/40 px-6 py-3 z-40 flex items-center justify-between pb-safe">
          <BottomNavItem icon={MessageSquare} label="Chats" isActive={activeTab === 'chats'} onClick={() => setActiveTab('chats')} badge={conversations.some(c => c.unreadCount > 0)} />
          <BottomNavItem icon={Compass} label="Descobrir" isActive={activeTab === 'discover'} onClick={() => setActiveTab('discover')} />
          <BottomNavItem icon={Wallet} label="Carteira" isActive={activeTab === 'wallet'} onClick={() => setShowWallet(true)} />
          <BottomNavItem icon={UserIcon} label="Perfil" isActive={activeTab === 'profile'} onClick={() => setShowSettings(true)} />
        </nav>
      )}

      <SettingsSheet
        isOpen={showSettings} onClose={() => setShowSettings(false)} user={user as CurrentUser}
        onUpdateUser={setUser} onLogout={handleLogout}
        onUnblock={() => {
          fetchConversations()
          fetchContacts()
        }}
        onOpenAlbum={() => { setShowSettings(false); setShowAlbum(true); }}
        onOpenWallet={() => { setShowSettings(false); setShowWallet(true); }}
      />

      <PhotoAlbum
        isOpen={showAlbum} onClose={() => setShowAlbum(false)} photos={albumPhotos}
        onUpdatePhotos={setAlbumPhotos}
        pendingRequests={[]}
        onApproveRequest={() => { }}
        onRejectRequest={() => { }}
        onUploadPhoto={async (f) => { const { uploadAlbumPhoto } = await import('@/lib/supabase/album'); return (await uploadAlbumPhoto(user.id, f)).data; }}
        onDeletePhoto={async (id) => { const { deleteAlbumPhoto } = await import('@/lib/supabase/album'); await deleteAlbumPhoto(id); }}
      />

      <WalletView isOpen={showWallet} onClose={() => setShowWallet(false)} currentUser={user as CurrentUser} />
      <InstallPrompt />
    </main>
  )
}

function BottomNavItem({ icon: Icon, label, isActive, onClick, badge }: any) {
  return (
    <button onClick={onClick} className={cn("flex flex-col items-center gap-1 transition-all relative active:scale-90", isActive ? "text-primary" : "text-muted-foreground")}>
      <div className={cn("p-1.5 rounded-xl", isActive && "bg-primary/10")}>
        <Icon className={cn("w-6 h-6", isActive && "fill-current")} />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
      {badge && <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
    </button>
  )
}
