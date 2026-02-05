'use client'

import { X, Lock, Sparkles, MessageCircle, Star, ShieldCheck, Zap, History, ChevronLeft, Layout, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { User } from '@/lib/types'
import Image from 'next/image'
import { useState, useEffect } from 'react'

interface UserProfileViewProps {
  isOpen: boolean
  onClose: () => void
  user: User
  onSendMessage: () => void
  onRequestPhoto: (photoId: string) => void
  onPurchasePhoto: (photoId: string, price: number) => Promise<boolean>
}

interface UserAlbumPhoto {
  id: string
  url: string
  hasAccess: boolean
  price?: number
}

export function UserProfileView({
  isOpen,
  onClose,
  user,
  onSendMessage,
  onRequestPhoto,
  onPurchasePhoto,
}: UserProfileViewProps) {
  const [albumPhotos, setAlbumPhotos] = useState<UserAlbumPhoto[]>([])
  const [stats, setStats] = useState<any>(null)
  const [isFlipped, setIsFlipped] = useState(false)
  const [requestedPhotos, setRequestedPhotos] = useState<Set<string>>(new Set())
  const [selectedPhoto, setSelectedPhoto] = useState<UserAlbumPhoto | null>(null)

  useEffect(() => {
    if (isOpen && user.id) {
      loadData()
    }
  }, [isOpen, user.id])

  const loadData = async () => {
    try {
      const { getSupabaseClient } = await import('@/lib/supabase/client')
      const supabase = getSupabaseClient()
      if (!supabase) return

      // Load Album
      const { getUserAlbum } = await import('@/lib/supabase/album')
      const { data: albumData } = await getUserAlbum(user.id)
      if (albumData) {
        setAlbumPhotos(albumData.map(p => ({
          id: p.id,
          url: p.url,
          hasAccess: !p.isBlurred,
          price: p.price
        })))
      }

      // Load Stats for Stars
      const { data: statsData } = await (supabase.rpc as any)('admin_get_user_stats', { p_user_id: user.id })
      setStats(statsData)
    } catch (error) {
      console.error('Erro ao carregar perfil:', error)
    }
  }

  const handleRequestPhoto = (photoId: string) => {
    setRequestedPhotos((prev) => new Set([...prev, photoId]))
    onRequestPhoto(photoId)
  }

  const handleBuyPhoto = async (photoId: string, price: number) => {
    const success = await onPurchasePhoto(photoId, price)
    if (success) {
      // Reload or update local hasAccess
      setAlbumPhotos(prev => prev.map(p => p.id === photoId ? { ...p, hasAccess: true } : p))
    }
  }

  const getStarRating = (earned: number) => {
    if (earned <= 100) return 1
    if (earned <= 500) return 2
    if (earned <= 2000) return 3
    if (earned <= 5000) return 4
    return 5
  }

  const totalEarned = stats?.total_received || 0
  const stars = getStarRating(totalEarned)
  const tier = stars === 5 ? 'Legend' : stars === 4 ? 'Gold' : stars === 3 ? 'Silver' : stars === 2 ? 'Bronze' : 'Rookie'

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
        {/* Game Card Container */}
        <div className="relative w-full max-w-[380px] h-[600px] perspective-1000 group">

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute -top-12 right-0 text-white/70 hover:text-white"
          >
            <X className="h-8 w-8" />
          </Button>

          {/* Inner Card Wrapper with Flip */}
          <div className={cn(
            "relative w-full h-full transition-all duration-700 preserve-3d cursor-pointer",
            isFlipped && "rotate-y-180"
          )}>

            {/* FRONT OF CARD (Main Profile) */}
            <div
              className="absolute inset-0 backface-hidden"
              onClick={() => setIsFlipped(true)}
            >
              <div className={cn(
                "w-full h-full rounded-[35px] border-4 overflow-hidden flex flex-col relative bg-card shadow-2xl transition-colors duration-500",
                stars === 5 ? "border-cyan-400 shadow-cyan-400/20" :
                  stars === 4 ? "border-yellow-400 shadow-yellow-400/20" :
                    stars === 3 ? "border-slate-300 shadow-slate-300/20" :
                      "border-primary/30"
              )}>

                {/* Image Section */}
                <div className="relative h-[65%] w-full overflow-hidden">
                  <Image
                    src={user.avatar || "/placeholder.svg"}
                    alt={user.name}
                    fill
                    className="object-cover"
                  />

                  {/* Rating Stars Overlay */}
                  <div className="absolute top-4 left-4 flex gap-1 z-10 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "w-4 h-4",
                          i < stars ? "fill-yellow-400 text-yellow-400" : "text-white/20"
                        )}
                      />
                    ))}
                  </div>

                  {/* Online Status Badge */}
                  <div className="absolute top-4 right-4 z-10">
                    <Badge className={cn(
                      "px-3 py-1 font-black text-[10px] uppercase tracking-widest",
                      user.isOnline ? "bg-green-500 text-white" : "bg-zinc-800 text-zinc-400"
                    )}>
                      {user.isOnline ? 'Online' : 'Offline'}
                    </Badge>
                  </div>

                  {/* Aesthetic Gradients */}
                  <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-card via-card/80 to-transparent" />
                </div>

                {/* Info Section */}
                <div className="flex-1 px-6 pb-6 flex flex-col justify-between -mt-8 z-10">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-3xl font-black italic tracking-tighter text-foreground leading-none">
                        {user.name}
                      </h2>
                      {stars >= 4 && <Zap className="w-5 h-5 text-primary fill-current" />}
                    </div>
                    <p className="text-primary font-bold uppercase tracking-[0.2em] text-[10px] opacity-80">
                      @{user.nickname} • {tier} Rank
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 mt-4">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        onSendMessage()
                      }}
                      className="flex-1 h-12 bg-primary hover:bg-primary/90 rounded-2xl font-black uppercase italic text-xs shadow-lg shadow-primary/20"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Enviar Mensagem
                    </Button>
                    <div className="h-12 w-12 rounded-2xl border border-primary/20 flex flex-col items-center justify-center bg-secondary/20">
                      <Layout className="w-5 h-5 opacity-40" />
                      <span className="text-[8px] font-bold uppercase opacity-40">Album</span>
                    </div>
                  </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
              </div>
            </div>

            {/* BACK OF CARD (Album & Stats) */}
            <div
              className="absolute inset-0 rotate-y-180 backface-hidden"
              onClick={() => setIsFlipped(false)}
            >
              <div className="w-full h-full rounded-[35px] border-4 border-primary/40 bg-zinc-950/95 backdrop-blur-xl p-6 flex flex-col shadow-2xl overflow-hidden relative">

                <div className="flex items-center gap-2 mb-6">
                  <History className="w-5 h-5 text-primary" />
                  <h3 className="font-black italic uppercase tracking-widest text-sm">Coleção de Fotos</h3>
                </div>

                {/* Album Grid inside Card */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {albumPhotos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-30 text-center px-4">
                      <Lock className="w-12 h-12 mb-4" />
                      <p className="text-xs font-bold uppercase">Esta coleção ainda <br /> não possui itens</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 pb-4">
                      {albumPhotos.map((photo) => (
                        <button
                          key={photo.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (!photo.hasAccess) {
                              if (photo.price && photo.price > 0) {
                                handleBuyPhoto(photo.id, photo.price)
                              } else {
                                if (!requestedPhotos.has(photo.id)) handleRequestPhoto(photo.id);
                              }
                            } else {
                              setSelectedPhoto(photo);
                            }
                          }}
                          className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-white/5"
                        >
                          <Image
                            src={photo.url || "/placeholder.svg"}
                            alt="Foto"
                            fill
                            className={cn(
                              'object-cover transition-all',
                              !photo.hasAccess && 'blur-xl'
                            )}
                          />
                          {!photo.hasAccess && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 group">
                              {photo.price && photo.price > 0 ? (
                                <div className="flex flex-col items-center gap-1 text-amber-500 scale-90 group-hover:scale-100 transition-transform">
                                  <ShoppingBag className="w-6 h-6" />
                                  <span className="text-[10px] font-black uppercase">{photo.price} ₮</span>
                                  <div className="bg-amber-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full mt-1">COMPRAR</div>
                                </div>
                              ) : requestedPhotos.has(photo.id) ? (
                                <Badge variant="secondary" className="text-[9px] font-bold">SOLICITADO</Badge>
                              ) : (
                                <div className="flex flex-col items-center gap-1 text-white scale-90 group-hover:scale-100 transition-transform">
                                  <Sparkles className="w-5 h-5" />
                                  <span className="text-[8px] font-black uppercase tracking-tighter">Desbloquear</span>
                                  <div className="bg-white/20 text-white text-[8px] font-black px-2 py-0.5 rounded-full mt-1 border border-white/30 tracking-tight">GRÁTIS</div>
                                </div>
                              )}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-muted-foreground">
                  <div className="flex items-center gap-1.5 opacity-60">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-black uppercase">Phantom Verified</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span>{stars} Stars</span>
                  </div>
                </div>

                <p className="text-[8px] font-bold text-center mt-3 text-muted-foreground uppercase tracking-widest">Toque para voltar ao perfil</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Lightbox / Fullscreen View */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full w-12 h-12 z-[70]"
          >
            <X className="w-8 h-8" />
          </Button>

          <div
            className="relative max-w-full max-h-full aspect-auto rounded-3xl overflow-hidden shadow-2xl border-2 border-white/10"
            onContextMenu={(e) => e.preventDefault()}
          >
            <img
              src={selectedPhoto.url}
              alt="Foto Expandida"
              className="max-h-[85vh] max-w-[90vw] object-contain select-none"
              style={{
                userSelect: 'none',
                WebkitTouchCallout: 'none'
              }}
              draggable={false}
            />
          </div>
        </div>
      )}

      <style jsx global>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </>
  )
}
