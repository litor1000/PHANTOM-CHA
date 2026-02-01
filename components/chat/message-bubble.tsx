'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Eye, Clock, Check, CheckCheck, Sparkles, Lock, ShoppingBag } from 'lucide-react'
import type { Message } from '@/lib/types'
import { cn } from '@/lib/utils'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  onReveal?: (messageId: string) => void
  onExpire?: (messageId: string) => void
  viewerNickname?: string
  onAcceptRequest?: (messageId: string, metadata: any) => Promise<void>
  onRejectRequest?: (messageId: string, metadata: any) => Promise<void>
  onPurchase?: (messageId: string, price: number) => Promise<boolean>
}

function formatTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
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
  onAcceptRequest,
  onRejectRequest,
  onPurchase,
}: MessageBubbleProps) {
  const [isRevealed, setIsRevealed] = useState(message.isRevealed)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [isExpiring, setIsExpiring] = useState(false)
  const [showLightbox, setShowLightbox] = useState(false)

  const [requestStatus, setRequestStatus] = useState<'pending' | 'accepted' | 'rejected'>(
    message.metadata?.status || 'pending'
  )

  // Paid content state
  const price = message.metadata?.price || 0
  const isPaidContent = price > 0
  const [isPurchased, setIsPurchased] = useState(message.metadata?.paymentStatus === 'paid')
  const [isBuying, setIsBuying] = useState(false)

  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Se for conteúdo pago, NÃO inicia contagem de expiração
    if (isPaidContent) return

    if (message.isRevealed && message.expiresAt && countdown === null && !isExpiring) {
      const timeLeft = Math.ceil((new Date(message.expiresAt).getTime() - Date.now()) / 1000)
      if (timeLeft > 0) {
        setCountdown(timeLeft)
        setIsRevealed(true)
      } else {
        setCountdown(0)
      }
    }
  }, [message.isRevealed, message.expiresAt, countdown, isExpiring, isPaidContent])

  useEffect(() => {
    if (message.metadata?.status && message.metadata.status !== requestStatus) {
      setRequestStatus(message.metadata.status)
    }
  }, [message.metadata?.status])

  const handleReveal = useCallback(() => {
    if (isRevealed || isOwn || message.type === 'request') return

    setIsRevealed(true)

    // Se for pago, não tem timer
    if (!isPaidContent) {
      const expiresInSeconds = message.expiresIn ?? 10
      setCountdown(expiresInSeconds)
    }

    onReveal?.(message.id)
  }, [isRevealed, isOwn, message.expiresIn, message.id, message.type, onReveal, isPaidContent])

  const handleRewardReveal = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()

    if (isOwn) return

    if (isPaidContent && !isPurchased) {
      if (onPurchase) {
        setIsBuying(true)
        const success = await onPurchase(message.id, price)
        setIsBuying(false)
        if (success) {
          setIsPurchased(true)
          setIsRevealed(true)
          // Não inicia countdown para pagos
        }
      } else {
        alert("Sistema de compras não configurado.")
      }
      return
    }
    handleReveal()
  }, [isPaidContent, isPurchased, onPurchase, message.id, price, isOwn, handleReveal])

  useEffect(() => {
    // Se for pago, timer não roda
    if (isPaidContent) return

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
  }, [countdown, message.id, onExpire, isPaidContent])

  const isLocked = !isOwn && isPaidContent && !isPurchased
  const showBlur = !isOwn && !isRevealed && message.type !== 'request' && !isLocked
  const showLock = isLocked

  const handleAccept = async () => {
    setRequestStatus('accepted')
    if (onAcceptRequest) {
      await onAcceptRequest(message.id, message.metadata)
    }
  }

  const handleReject = async () => {
    setRequestStatus('rejected')
    if (onRejectRequest) {
      await onRejectRequest(message.id, message.metadata)
    }
  }

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Open lightbox only if paid/purchased/own. Free photos NO lightbox.
    if ((isPaidContent && (isPurchased || isOwn))) {
      setShowLightbox(true)
    }
  }

  return (
    <>
      {/* Lightbox */}
      {showLightbox && message.type === 'image' && message.imageUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowLightbox(false)}
        >
          <div className="relative max-w-full max-h-full">
            <img
              src={message.imageUrl}
              alt="Full size"
              className="max-w-[95vw] max-h-[95vh] object-contain select-none pointer-events-auto"
              onContextMenu={(e) => e.preventDefault()}
              draggable={false}
            />
          </div>
          <button
            className="absolute top-4 right-4 text-white/50 hover:text-white p-2 rounded-full hover:bg-white/10"
            onClick={(e) => { e.stopPropagation(); setShowLightbox(false) }}
          >
            ✕
          </button>
        </div>
      )}

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
            !isOwn && !isRevealed && message.type !== 'request' && !isLocked && 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]',
            isLocked && 'cursor-pointer hover:brightness-110 active:scale-[0.99] border-2 border-amber-500/50 bg-amber-500/10',
            countdown !== null && countdown <= 3 && 'animate-pulse'
          )}
          onClick={isLocked ? handleRewardReveal : handleReveal}
          role={!isOwn && !isRevealed ? 'button' : undefined}
          tabIndex={!isOwn && !isRevealed ? 0 : undefined}
        >
          <div className="relative min-h-[24px]">
            {message.type === 'request' ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">{message.content}</p>
                {!isOwn && (
                  <div className="mt-1">
                    {requestStatus === 'pending' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReject(); }}
                          className="flex-1 bg-red-500/20 text-red-500 hover:bg-red-500/30 text-xs py-1.5 rounded-md font-medium transition-colors"
                        >
                          Recusar
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAccept(); }}
                          className="flex-1 bg-green-500/20 text-green-500 hover:bg-green-500/30 text-xs py-1.5 rounded-md font-medium transition-colors"
                        >
                          Aceitar
                        </button>
                      </div>
                    ) : requestStatus === 'accepted' ? (
                      <div className="w-full bg-green-500/10 text-green-500 text-xs py-1.5 rounded-md font-medium text-center border border-green-500/20">
                        Permissão Concedida
                      </div>
                    ) : (
                      <div className="w-full bg-red-500/10 text-red-500 text-xs py-1.5 rounded-md font-medium text-center border border-red-500/20">
                        Permissão Negada
                      </div>
                    )}
                  </div>
                )}
                {isOwn && (
                  <div className="mt-1">
                    {requestStatus === 'pending' ? (
                      <span className="text-xs text-muted-foreground opacity-70 italic">Aguardando resposta...</span>
                    ) : requestStatus === 'accepted' ? (
                      <span className="text-xs text-green-500 font-medium">Permissão Aceita</span>
                    ) : (
                      <span className="text-xs text-red-500 font-medium">Permissão Recusada</span>
                    )}
                  </div>
                )}
              </div>
            ) : message.type === 'image' && message.imageUrl ? (
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

                if (showLock) {
                  return (
                    <div className="flex flex-col items-center justify-center p-4 gap-2 text-center">
                      <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mb-1">
                        {isBuying ? (
                          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Lock className="w-6 h-6 text-amber-500" />
                        )}
                      </div>
                      <p className="font-bold text-amber-500">Conteúdo Pago</p>
                      <p className="text-xs text-muted-foreground opacity-90">
                        Desbloqueie essa foto por <span className="font-bold text-foreground">{price} Tokens</span>
                      </p>
                      <div className="mt-2 bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm">
                        <ShoppingBag className="w-3 h-3" />
                        {isBuying ? 'Comprando...' : 'Comprar Agora'}
                      </div>
                    </div>
                  )
                }

                return (
                  <img
                    src={message.imageUrl}
                    alt="Imagem"
                    onClick={handleImageClick}
                    className={cn(
                      "max-w-[240px] max-h-[240px] rounded-lg object-cover select-none",
                      isPaidContent ? "cursor-zoom-in" : "cursor-default"
                    )}
                    onContextMenu={(e) => e.preventDefault()}
                    draggable={false}
                  />
                )
              })()
            ) : (
              <p
                className={cn(
                  'text-xl leading-relaxed transition-all duration-300',
                  (showBlur || showLock) && 'blur-lg select-none'
                )}
              >
                {message.content}
              </p>
            )}

            {showLock && message.type === 'text' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                <Lock className="w-6 h-6 text-amber-500 mb-1" />
                <span className="text-xs font-bold text-amber-500">{price} ₮</span>
              </div>
            )}

            {showBlur && !showLock && (
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
          </div>

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
    </>
  )
}
