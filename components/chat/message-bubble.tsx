'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Eye, Clock, Check, CheckCheck, Sparkles } from 'lucide-react'
import type { Message } from '@/lib/types'
import { cn } from '@/lib/utils'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  onReveal?: (messageId: string) => void
  onExpire?: (messageId: string) => void
  viewerNickname?: string
}

function formatTime(date: Date | string): string {
  // Convert string to Date if needed (happens when loading from localStorage)
  const dateObj = typeof date === 'string' ? new Date(date) : date

  // Check if date is valid
  if (isNaN(dateObj.getTime())) return ''

  return dateObj.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function MessageBubble({
  message,
  isOwn,
  onReveal,
  onExpire,
  viewerNickname,
}: MessageBubbleProps) {
  const [isRevealed, setIsRevealed] = useState(message.isRevealed)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [isExpiring, setIsExpiring] = useState(false)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const handleReveal = useCallback(() => {
    if (isRevealed || isOwn) return

    setIsRevealed(true)
    const expiresInSeconds = message.expiresIn ?? 10
    console.log('⏱️ Mensagem revelada! Timer iniciado:', expiresInSeconds, 'segundos')
    setCountdown(expiresInSeconds)
    onReveal?.(message.id)
  }, [isRevealed, isOwn, message.expiresIn, message.id, onReveal])

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    if (countdown === 0) {
      console.log('💥 Mensagem expirada! ID:', message.id)
      setIsExpiring(true)
      setTimeout(() => {
        console.log('🗑️ Removendo mensagem:', message.id)
        onExpire?.(message.id)
      }, 300)
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [countdown, message.id, onExpire])

  const showBlur = !isOwn && !isRevealed

  // Only show timer if strictly positive
  const showTimer = countdown !== null && countdown > 0

  return (
    <div
      className={cn(
        'flex w-full transition-all duration-300',
        isOwn ? 'justify-end' : 'justify-start',
        isExpiring && 'opacity-0 scale-95 translate-y-2'
      )}
    >
      <div
        className={cn(
          'relative max-w-[80%] rounded-2xl px-4 py-2 transition-all duration-200',
          isOwn
            ? 'bg-message-sent text-foreground rounded-br-md'
            : 'bg-message-received text-foreground rounded-bl-md',
          !isOwn && !isRevealed && 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]',
          countdown !== null && countdown <= 3 && 'animate-pulse'
        )}
        onClick={handleReveal}
        role={!isOwn && !isRevealed ? 'button' : undefined}
        tabIndex={!isOwn && !isRevealed ? 0 : undefined}
        aria-label={
          !isOwn && !isRevealed
            ? 'Clique para revelar a mensagem'
            : undefined
        }
      >
        {/* Message Content */}
        <div className="relative min-h-[24px]">
          {message.type === 'image' && message.imageUrl ? (
            (() => {
              const restricted =
                !isOwn &&
                Array.isArray(message.allowedNicknames) &&
                message.allowedNicknames.length > 0 &&
                viewerNickname &&
                !message.allowedNicknames.includes(viewerNickname.toLowerCase())
              if (restricted) {
                return (
                  <div className="text-sm text-muted-foreground">
                    Imagem visivel apenas para @{message.allowedNicknames?.join(', @') || ''}
                  </div>
                )
              }
              return (
                <img
                  src={message.imageUrl}
                  alt="Imagem"
                  className="max-w-[240px] max-h-[240px] rounded-lg object-cover"
                />
              )
            })()
          ) : (
            <p
              className={cn(
                'text-xl leading-relaxed transition-all duration-300',
                showBlur && 'blur-lg select-none'
              )}
            >
              {message.content}
            </p>
          )}

          {/* Blur Overlay with Icon - Hidden State */}
          {showBlur && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-1.5 text-primary">
                <div className="relative">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                  <Eye className="h-3 w-3 absolute -bottom-0.5 -right-0.5" />
                </div>
                <span className="text-[10px] font-medium tracking-wide">Clique para ver</span>
              </div>
            </div>
          )}

          {/* Countdown timer overlay (optional) */}
          {showTimer && !isOwn && (
            <div className="absolute -top-1 -right-1 bg-background/80 backdrop-blur-sm rounded-full w-5 h-5 flex items-center justify-center border border-border">
              <span className="text-[10px] font-bold text-primary">{countdown}</span>
            </div>
          )}
        </div>

        {/* Time and Status */}
        <div
          className={cn(
            'flex items-center justify-end gap-1 mt-1 transition-all duration-300',
            showBlur && 'blur-sm opacity-50'
          )}
        >
          <span className="text-[10px] text-muted-foreground">
            {formatTime(message.timestamp)}
          </span>
          {isOwn && (
            message.isRead ? (
              <CheckCheck className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Check className="h-3.5 w-3.5 text-muted-foreground" />
            )
          )}
        </div>
      </div>
    </div>
  )
}
