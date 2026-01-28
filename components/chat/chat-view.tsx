'use client'

import { useState, useRef, useEffect } from 'react'
import type { Message, User } from '@/lib/types'
import { mockMessages } from '@/lib/mock-data'
import { currentUser } from '@/lib/mock-data'
import { ChatHeader } from './chat-header'
import { MessageBubble } from './message-bubble'
import { MessageInput } from './message-input'
import { UserProfileView } from '@/components/profile/user-profile-view'

interface ChatViewProps {
  user: User
  onBack: () => void
}

export function ChatView({ user, onBack }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>(
    mockMessages[user.id] || []
  )
  const [showProfile, setShowProfile] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages])

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
  }

  const handleExpire = (messageId: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId))
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
