'use client'

import { useState, useEffect } from 'react'
import { ConversationList } from '@/components/chat/conversation-list'
import { ChatView } from '@/components/chat/chat-view'
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow'
import { mockConversations, mockUsers } from '@/lib/mock-data'
import type { CurrentUser, Conversation, User, Message } from '@/lib/types'
import type { UserFormData } from '@/components/onboarding/auth-form-refactored'
import { getCurrentUser, updateUserProfile, searchUserByNickname } from '@/lib/supabase/auth'
import { uploadProfilePhoto, uploadCoverPhoto } from '@/lib/supabase/storage'

export default function Home() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [contacts, setContacts] = useState<User[]>([])

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
        // Load user-specific contacts
        const savedContacts = localStorage.getItem(`phantom-contacts-${supabaseUser.id}`)
        if (savedContacts) {
          try {
            setContacts(JSON.parse(savedContacts))
          } catch { }
        }
      } else {
        // Fallback to localStorage
        const savedUser = localStorage.getItem('phantom-user')
        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser)
            setUser(parsedUser)
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

    // Poll every 3 seconds
    const interval = setInterval(fetchConversations, 3000)
    return () => clearInterval(interval)
  }, [user?.id])

  // Reload contacts from Supabase on init
  useEffect(() => {
    if (user?.id && user.id !== 'current-user') {
      const loadContacts = async () => {
        const { getContacts } = await import('@/lib/supabase/contacts')
        const { data } = await getContacts(user.id)
        if (data) {
          setContacts(data)
        }
      }
      loadContacts()
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
      const existingIndex = prev.findIndex(c => c.user.id === userId)

      if (existingIndex >= 0) {
        // Atualizar conversa existente
        const updated = [...prev]
        updated[existingIndex] = {
          ...updated[existingIndex],
          lastMessage: lastMessage,
          unreadCount: updated[existingIndex].unreadCount
        }
        localStorage.setItem('phantom-conversations', JSON.stringify(updated))
        return updated
      } else {
        // Criar nova conversa
        const newConv: Conversation = {
          id: `conv-${userId}`,
          user: contactUser,
          lastMessage: lastMessage,
          unreadCount: 0,
          isGroup: false
        }
        const updated = [newConv, ...prev]
        localStorage.setItem('phantom-conversations', JSON.stringify(updated))
        return updated
      }
    })
  }

  if (isLoading) {
    return (
      <main className="h-dvh w-full flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  if (!user) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />
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
      // If the conversation ID matches the selected user ID (often used as key) or 
      // if we can find the user ID from the conversation ID
      // Note: In our app, conversationId is often `conv-{userId}` or we find conversation by user ID.
      // Let's check if the deleted conversation corresponds to the open chat.
      const deletedConv = conversations.find(c => c.id === conversationId)
      if (deletedConv && deletedConv.user.id === selectedUserId) {
        setSelectedUserId(null)
      }
    }
  }



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

  return (
    <main className="h-dvh w-full max-w-md mx-auto flex flex-col bg-background overflow-hidden shadow-2xl">
      {selectedUserId && selectedUser ? (
        <ChatView
          user={selectedUser}
          onBack={() => setSelectedUserId(null)}
          onMessageSent={handleMessageSent}
        />
      ) : (
        <ConversationList
          conversations={conversations}
          onSelectConversation={setSelectedUserId}
          currentUser={user}
          onUpdateUser={handleUpdateUser}
          onLogout={handleLogout}
          contacts={contacts}
          onAddContact={handleAddContact}
          onCreateGroup={handleCreateGroup}
          onAcceptInvite={handleAcceptInvite}
          onRejectInvite={handleRejectInvite}
          onDeleteConversation={handleDeleteConversation}
        />
      )}
    </main>
  )
}
