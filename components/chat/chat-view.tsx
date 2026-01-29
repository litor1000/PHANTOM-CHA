'use client'

import { useState, useRef, useEffect } from 'react'
import type { Message, User } from '@/lib/types'
import { mockMessages } from '@/lib/mock-data'
import { currentUser } from '@/lib/mock-data'
import { ChatHeader } from './chat-header'
import { MessageBubble } from './message-bubble'
import { MessageInput } from './message-input'
import { UserProfileView } from '@/components/profile/user-profile-view'
import { useTutorial } from '@/hooks/use-tutorial'
import { TUTORIAL_BOT_ID } from '@/lib/bot-data'

interface ChatViewProps {
  user: User
  onBack: () => void
}

export function ChatView({ user, onBack }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [showProfile, setShowProfile] = useState(false)
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

  useEffect(() => {
    // Load messages
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

    // If this is the tutorial bot, notify that conversation was opened
    if (isTutorialBot) {
      handleConversationOpened()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id])

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

  const handleSend = (content: string, expiresIn?: number) => {
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

  const handleReveal = (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, isRevealed: true, isRead: true } : msg
      )
    )

    // Notify tutorial if this is the tutorial bot
    if (isTutorialBot) {
      handleMessageRevealed(messageId)
    }
  }

  const handleExpire = (messageId: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId))

    // Notify tutorial if this is the tutorial bot
    if (isTutorialBot) {
      handleMessageExpired(messageId)
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
