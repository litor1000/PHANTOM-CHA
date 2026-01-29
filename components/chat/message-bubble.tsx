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

function CircularProgress({ progress }: { progress: number }) {
  const radius = 18
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
      <circle
        cx="22"
        cy="22"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        className="text-muted/30"
      />
      <circle
        cx="22"
        cy="22"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        className="text-primary transition-all duration-100"
      />
    </svg>
  )
}

export function MessageBubble({
  message,
  isOwn,
  onReveal,
  onExpire,
  viewerNickname,
}: MessageBubbleProps) {
  const [isRevealed, setIsRevealed] = useState(message.isRevealed)
  const [isHolding, setIsHolding] = useState(false)
  const [holdProgress, setHoldProgress] = useState(0)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [isExpiring, setIsExpiring] = useState(false)
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const HOLD_DURATION = 600 // ms to reveal

  const startReveal = useCallback(() => {
    if (isRevealed || isOwn) return
    setIsHolding(true)
    setHoldProgress(0)
  }, [isRevealed, isOwn])

  const endReveal = useCallback(() => {
    if (!isHolding) return
    setIsHolding(false)
    setHoldProgress(0)

    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current)
      holdTimeoutRef.current = null
    }
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current)
      holdIntervalRef.current = null
    }
  }, [isHolding])

  useEffect(() => {
    if (isHolding && !isRevealed) {
      const startTime = Date.now()

      holdIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime
        const progress = Math.min((elapsed / HOLD_DURATION) * 100, 100)
        setHoldProgress(progress)
      }, 16)

      holdTimeoutRef.current = setTimeout(() => {
        setIsRevealed(true)
        setHoldProgress(100)
        setCountdown(message.expiresIn ?? 5)
        setIsHolding(false)
        onReveal?.(message.id)

        if (holdIntervalRef.current) {
          clearInterval(holdIntervalRef.current)
        }
      }, HOLD_DURATION)
    }

    return () => {
      if (holdTimeoutRef.current) {
        clearTimeout(holdTimeoutRef.current)
      }
      if (holdIntervalRef.current) {
        clearInterval(holdIntervalRef.current)
      }
    }
  }, [isHolding, isRevealed, message.id, onReveal])

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
      setIsExpiring(true)
      setTimeout(() => {
        onExpire?.(message.id)
      }, 300)
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [countdown, message.id, onExpire])

  const showBlur = !isOwn && !isRevealed && !isHolding

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
          isHolding && !isOwn && 'scale-[1.03] shadow-xl shadow-primary/30 ring-2 ring-primary/50',
          countdown !== null && countdown <= 2 && 'animate-pulse'
        )}
        onMouseDown={startReveal}
        onMouseUp={endReveal}
        onMouseLeave={endReveal}
        onTouchStart={startReveal}
        onTouchEnd={endReveal}
        role={!isOwn && !isRevealed ? 'button' : undefined}
        tabIndex={!isOwn && !isRevealed ? 0 : undefined}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            startReveal()
          }
        }}
        onKeyUp={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            endReveal()
          }
        }}
        aria-label={
          !isOwn && !isRevealed
            ? 'Segure para revelar a mensagem'
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
                'text-sm leading-relaxed transition-all duration-300',
                showBlur && 'blur-lg select-none',
                isHolding && !isRevealed && 'blur-sm'
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
                <span className="text-[10px] font-medium tracking-wide">Segure para ver</span>
              </div>
            </div>
          )}

          {/* Hold Progress Indicator */}
          {isHolding && !isRevealed && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <CircularProgress progress={holdProgress} />
                <Eye className="h-4 w-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" />
              </div>
            </div>
          )}

          {/* Countdown Badge */}
          {countdown !== null && countdown > 0 && (
            <div
              className={cn(
                "absolute -top-3 -right-3 flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium shadow-lg",
                countdown <= 2
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-primary text-primary-foreground"
              )}
            >
              <Clock className="h-3 w-3" />
              {countdown}s
            </div>
          )}
        </div>

        {/* Time and Status */}
        <div
          className={cn(
            'flex items-center justify-end gap-1 mt-1 transition-all duration-300',
            (showBlur || isHolding) && 'blur-sm opacity-50'
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
