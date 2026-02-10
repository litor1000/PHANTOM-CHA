'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Eye, Clock, Check, CheckCheck, Sparkles, Lock, ShoppingBag, Play, Video as VideoIcon, Mic, Pause, Volume2, Activity, Trash2 } from 'lucide-react'
import type { Message } from '@/lib/types'
import { cn } from '@/lib/utils'
import { LinkPreview } from './link-preview'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  onReveal?: (messageId: string) => void
  onExpire?: (messageId: string) => void
  viewerNickname?: string
  onAcceptRequest?: (messageId: string, metadata: any) => Promise<void>
  onRejectRequest?: (messageId: string, metadata: any) => Promise<void>
  onPurchase?: (messageId: string, price: number) => Promise<boolean>
  onDelete?: (messageId: string) => void
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
  onDelete,
}: MessageBubbleProps) {
  const [isRevealed, setIsRevealed] = useState(message.isRevealed)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [isExpiring, setIsExpiring] = useState(false)
  const [showLightbox, setShowLightbox] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioProgress, setAudioProgress] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [requestStatus, setRequestStatus] = useState<'pending' | 'accepted' | 'rejected'>(
    message.metadata?.status || 'pending'
  )

  // Paid content state
  const price = message.metadata?.price || 0
  const isPaidContent = price > 0
  const [isPurchased, setIsPurchased] = useState(message.metadata?.paymentStatus === 'paid')
  const [isBuying, setIsBuying] = useState(false)

  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)

  const handleLongPress = useCallback(() => {
    // Feedback tátil se possível
    if (typeof window !== 'undefined' && 'navigator' in window && (window.navigator as any).vibrate) {
      window.navigator.vibrate(50)
    }

    if (confirm('Deseja excluir esta mensagem definitivamente?')) {
      onDelete?.(message.id)
    }
  }, [message.id, onDelete])

  const startPress = useCallback(() => {
    longPressTimerRef.current = setTimeout(handleLongPress, 700) // 700ms para considerar pressão longa
  }, [handleLongPress])

  const cancelPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
    }
  }, [])

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
  }, [message.metadata?.status, requestStatus])

  // Sincronizar estado com Realtime props
  useEffect(() => {
    setIsRevealed(message.isRevealed)
  }, [message.isRevealed])

  useEffect(() => {
    setIsPurchased(message.metadata?.paymentStatus === 'paid')
  }, [message.metadata?.paymentStatus])

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
  // showBlur é apenas para mensagens GRATUITAS que ainda não foram reveladas
  const showBlur = !isOwn && !isRevealed && message.type !== 'request' && !isPaidContent
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

  const toggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100
      setAudioProgress(progress)
    }
  }

  const handleAudioEnded = () => {
    setIsPlaying(false)
    setAudioProgress(0)
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
            'relative max-w-[80%] rounded-2xl px-4 py-2 transition-all duration-300',
            isOwn
              ? 'bg-message-sent text-foreground rounded-br-md'
              : 'bg-message-received text-foreground rounded-bl-md',
            showBlur && 'shadow-lg border border-primary/20 overflow-hidden',
            !isOwn && !isRevealed && message.type !== 'request' && !isLocked && 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]',
            isLocked && 'cursor-pointer hover:brightness-110 active:scale-[0.99] border-2 border-amber-500/50 bg-amber-500/10',
            countdown !== null && countdown <= 3 && 'animate-pulse'
          )}
          onPointerDown={startPress}
          onPointerUp={cancelPress}
          onPointerLeave={cancelPress}
          onContextMenu={(e) => {
            e.preventDefault() // Previne menu nativo do Android no long press
          }}
          onClick={(e) => {
            cancelPress()
            if (isLocked) handleRewardReveal(e)
            else handleReveal()
          }}
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
            ) : message.type === 'audio' && message.audioUrl ? (
              <div className="flex flex-col gap-2 min-w-[200px]">
                <div
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 relative overflow-hidden",
                    showBlur && "blur-md select-none"
                  )}
                  onClick={showBlur ? handleReveal : undefined}
                >
                  <button
                    onClick={!showBlur ? toggleAudio : undefined}
                    className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary group-hover:bg-primary/30 transition-colors"
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                  </button>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      <span className="flex items-center gap-1"><Mic className="w-3 h-3" /> Voice Note</span>
                      {isPlaying && <Activity className="w-3 h-3 text-primary animate-pulse" />}
                    </div>
                    <div className="relative h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-primary transition-all duration-100 ease-linear"
                        style={{ width: `${audioProgress}%` }}
                      />
                    </div>
                  </div>

                  <audio
                    ref={audioRef}
                    src={message.audioUrl}
                    onTimeUpdate={handleAudioTimeUpdate}
                    onEnded={handleAudioEnded}
                    className="hidden"
                  />
                </div>
                {showBlur && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-[10px] font-black uppercase text-primary/40 tracking-[0.2em] italic animate-pulse">Revelar Áudio</span>
                  </div>
                )}
              </div>
            ) : message.type === 'video' && message.videoUrl ? (
              <div className="flex flex-col gap-2">
                {showLock ? (
                  <div className="flex flex-col items-center justify-center p-4 gap-2 text-center">
                    <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mb-1">
                      {isBuying ? (
                        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <VideoIcon className="w-6 h-6 text-amber-500" />
                      )}
                    </div>
                    <p className="font-bold text-amber-500 uppercase italic text-[10px]">Vídeo Protegido</p>
                    <p className="text-zinc-400 text-sm">
                      ₮ {price} Tokens
                    </p>
                    <div className="mt-2 bg-amber-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm uppercase italic">
                      <ShoppingBag className="w-3 h-3" />
                      {isBuying ? 'Liberando...' : 'Liberar Vídeo'}
                    </div>
                  </div>
                ) : (
                  <div className="relative group rounded-xl overflow-hidden bg-zinc-900 border border-white/5">
                    <video
                      src={message.videoUrl}
                      className={cn(
                        "max-w-[260px] max-h-[300px] w-full object-cover select-none",
                        showBlur && "blur-2xl"
                      )}
                      autoPlay={!showBlur}
                      muted
                      loop
                      playsInline
                    />
                    {!showBlur && (
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md text-[8px] font-bold text-white uppercase tracking-widest border border-white/10">
                        HD Video
                      </div>
                    )}
                    {showBlur && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Play className="w-10 h-10 text-white opacity-40" />
                      </div>
                    )}
                  </div>
                )}
                {message.content && <p className={cn("text-sm transition-all", showBlur && "blur-md")}>{message.content}</p>}
              </div>
            ) : (message.type === 'image' || (message.type === 'text' && isPaidContent && message.content.includes('Foto'))) ? (
              (() => {
                const restricted =
                  !isOwn &&
                  Array.isArray(message.allowedNicknames) &&
                  message.allowedNicknames.length > 0 &&
                  viewerNickname &&
                  !message.allowedNicknames.includes(viewerNickname.toLowerCase())

                if (restricted) {
                  return (
                    <div className="text-sm text-muted-foreground p-4">
                      Imagem visivel apenas para @{message.allowedNicknames?.join(', @') || ''}
                    </div>
                  )
                }

                if (showLock) {
                  return (
                    <div className="relative group overflow-hidden rounded-xl bg-zinc-950/40 border border-amber-500/20 shadow-2xl transition-all duration-500 hover:shadow-amber-500/10">
                      {/* Efeito de Vidro Jateado Premium (Blur Preview) */}
                      {message.imageUrl && (
                        <div className="absolute inset-0 z-0 overflow-hidden">
                          <img
                            src={message.imageUrl}
                            alt="Blur Preview"
                            className="w-full h-full object-cover blur-[25px] scale-125 opacity-40 brightness-[1.1] transition-all duration-1000 group-hover:scale-110 group-hover:brightness-[1.2]"
                          />
                          <div className="absolute inset-0 bg-white/10 backdrop-blur-md" />
                          <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/5" />
                        </div>
                      )}

                      <div className="relative z-10 flex flex-col items-center justify-center p-6 gap-3 text-center min-w-[200px] min-h-[220px]">
                        <div className="w-16 h-16 rounded-full bg-amber-500/20 backdrop-blur-md flex items-center justify-center mb-1 shadow-[0_0_30px_rgba(245,158,11,0.2)] border border-amber-500/30">
                          {isBuying ? (
                            <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Lock className="w-8 h-8 text-amber-500 fill-amber-500/10" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="font-black text-amber-500 uppercase tracking-tighter italic text-[10px] opacity-80">Foto Protegida</p>
                          <div className="flex items-baseline justify-center gap-1">
                            <span className="text-3xl font-black text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                              ₮ {price}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={handleRewardReveal}
                          className="mt-2 bg-amber-500 text-white text-[10px] font-black px-8 py-2.5 rounded-full flex items-center gap-2 shadow-2xl uppercase tracking-[0.15em] hover:bg-amber-400 hover:scale-105 active:scale-95 transition-all outline-none"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          {isBuying ? 'Liberando...' : 'Desbloquear'}
                        </button>
                      </div>
                    </div>
                  )
                }

                return message.imageUrl ? (
                  <div className="relative group overflow-hidden rounded-lg bg-zinc-900/50">
                    <img
                      key={message.id}
                      src={message.imageUrl}
                      alt="Imagem"
                      onClick={handleImageClick}
                      className={cn(
                        "max-w-[240px] max-h-[240px] rounded-lg object-cover select-none transition-all duration-500 opacity-0",
                        (isPaidContent || isOwn) ? "cursor-zoom-in" : "cursor-default"
                      )}
                      onLoad={(e) => {
                        (e.target as HTMLImageElement).classList.remove('opacity-0')
                      }}
                      onContextMenu={(e) => e.preventDefault()}
                      draggable={false}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 gap-3 text-muted-foreground bg-zinc-900/60 rounded-xl border border-white/5 min-w-[200px]">
                    <div className="relative">
                      <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                      <Sparkles className="w-3 h-3 text-primary absolute -top-1 -right-1 animate-bounce" />
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-black tracking-[0.2em] uppercase opacity-40 italic">Processando</span>
                      <span className="text-[8px] font-bold text-primary/60 uppercase tracking-tighter">Preparando Mídia...</span>
                    </div>
                  </div>
                )
              })()
            ) : (
              <div className="space-y-1">
                <p
                  className={cn(
                    'text-lg leading-relaxed transition-all duration-300 whitespace-pre-wrap',
                    (showBlur || showLock) && 'blur-lg select-none'
                  )}
                >
                  {message.content}
                </p>

                {/* Link Preview if visible */}
                {!showBlur && !showLock && message.content.match(/(https?:\/\/[^\s]+)/g)?.map((url, i) => (
                  <LinkPreview key={i} url={url} />
                ))}
              </div>
            )}

            {showLock && message.type === 'text' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                <Lock className="w-6 h-6 text-amber-500 mb-1" />
                <span className="text-xs font-bold text-amber-500">{price} ₮</span>
              </div>
            )}

            {showBlur && !showLock && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/20 backdrop-blur-[30px] z-10 border border-white/10">
                <div className="flex flex-col items-center gap-2 text-primary">
                  <div className="relative group-hover:scale-110 transition-transform duration-500">
                    <Sparkles className="h-8 w-8 animate-pulse text-primary fill-primary/20" />
                    <Eye className="h-4 w-4 absolute -bottom-1 -right-1 text-white shadow-lg" />
                  </div>
                  <span className="text-[9px] font-black tracking-[0.3em] uppercase text-primary/80 italic drop-shadow-sm">Revelar</span>
                </div>
              </div>
            )}
          </div>

          <div
            className={cn(
              'flex items-center justify-end gap-1 mt-auto pt-2 transition-all duration-300',
              showBlur && 'opacity-30'
            )}
          >
            <span className="text-[10px] text-muted-foreground">
              {formatTime(message.timestamp)}
            </span>

            {isOwn && (
              <div className="flex items-center gap-1 ml-1">
                {message.isRead ? (
                  <CheckCheck className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Check className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
