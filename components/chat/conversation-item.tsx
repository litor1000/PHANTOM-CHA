'use client'

import { Eye } from 'lucide-react'
import type { Conversation } from '@/lib/types'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface ConversationItemProps {
  conversation: Conversation
  onClick: () => void
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatTime(date?: Date | string): string {
  if (!date) return ''

  // Convert string to Date if needed (happens when loading from localStorage)
  const dateObj = typeof date === 'string' ? new Date(date) : date

  // Check if date is valid
  if (isNaN(dateObj.getTime())) return ''

  const now = new Date()
  const diff = now.getTime() - dateObj.getTime()
  const hours = Math.floor(diff / 3600000)

  if (hours < 24) {
    return dateObj.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  return dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })
}

export function ConversationItem({ conversation, onClick }: ConversationItemProps) {
  const { user, lastMessage, unreadCount } = conversation
  const hasUnread = unreadCount > 0
  const isFromMe = lastMessage?.senderId === 'current-user'

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
    >
      <div className="relative shrink-0">
        <Avatar className="h-12 w-12">
          <AvatarFallback className="bg-primary/20 text-primary font-medium">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
        {user.isOnline && (
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn(
              "font-semibold truncate",
              hasUnread ? "text-foreground" : "text-foreground/80"
            )}>
              {user.name}
            </span>
            <span className="text-xs text-muted-foreground/70 truncate">
              @{user.nickname}
            </span>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatTime(lastMessage?.timestamp)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 mt-0.5">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground truncate">
            {isFromMe && <span className="text-xs">Você:</span>}
            {lastMessage && !lastMessage.isRevealed && !isFromMe ? (
              <span className="flex items-center gap-1 italic">
                <Eye className="h-3.5 w-3.5" />
                Mensagem secreta
              </span>
            ) : (
              <span className="truncate">{lastMessage?.content || 'Sem mensagens'}</span>
            )}
          </div>

          {hasUnread && (
            <span className="shrink-0 flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
              {unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
