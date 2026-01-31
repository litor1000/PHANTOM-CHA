'use client'

import { X, Lock, Sparkles, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
}

interface UserAlbumPhoto {
  id: string
  url: string
  hasAccess: boolean
}

export function UserProfileView({
  isOpen,
  onClose,
  user,
  onSendMessage,
  onRequestPhoto,
}: UserProfileViewProps) {
  const [albumPhotos, setAlbumPhotos] = useState<UserAlbumPhoto[]>([])

  useEffect(() => {
    if (isOpen && user.id) {
      const loadAlbum = async () => {
        const { getUserAlbum } = await import('@/lib/supabase/album')
        const { data } = await getUserAlbum(user.id)
        if (data) {
          setAlbumPhotos(data.map(p => ({
            id: p.id,
            url: p.url,
            hasAccess: !p.isBlurred
          })))
        }
      }
      loadAlbum()
    }
  }, [isOpen, user.id])

  const [requestedPhotos, setRequestedPhotos] = useState<Set<string>>(new Set())

  const handleRequestPhoto = (photoId: string) => {
    setRequestedPhotos((prev) => new Set([...prev, photoId]))
    onRequestPhoto(photoId)
  }

  const [selectedPhoto, setSelectedPhoto] = useState<UserAlbumPhoto | null>(null)

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
        <div
          className={cn(
            'fixed inset-y-0 right-0 w-full max-w-md bg-background border-l border-border shadow-xl',
            'flex flex-col',
            'animate-in slide-in-from-right duration-300'
          )}
        >
          {/* Header with Cover */}
          <div className="relative h-40 bg-gradient-to-br from-primary/30 to-primary/10">
            {user.coverPhoto && (
              <Image
                src={user.coverPhoto || "/placeholder.svg"}
                alt="Capa"
                fill
                className="object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute top-3 right-3 bg-background/50 hover:bg-background/80"
            >
              <X className="h-5 w-5" />
            </Button>

            {/* Profile Photo */}
            <div className="absolute -bottom-12 left-4">
              <div className="w-24 h-24 rounded-full bg-card border-4 border-background overflow-hidden">
                {user.avatar ? (
                  <Image
                    src={user.avatar || "/placeholder.svg"}
                    alt={user.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/20">
                    <span className="text-2xl font-bold text-primary">
                      {user.name[0].toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="px-4 pt-16 pb-4 border-b border-border">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">{user.name}</h2>
                <p className="text-sm text-muted-foreground">@{user.nickname}</p>
              </div>
              <Button onClick={onSendMessage} size="sm">
                <MessageCircle className="w-4 h-4 mr-2" />
                Mensagem
              </Button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  user.isOnline ? 'bg-green-500' : 'bg-muted-foreground'
                )}
              />
              <span className="text-xs text-muted-foreground">
                {user.isOnline ? 'Online agora' : 'Offline'}
              </span>
            </div>
          </div>

          {/* Album Section */}
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Album de Fotos</h3>

            {albumPhotos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Lock className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">Nenhuma foto no album</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {albumPhotos.map((photo) => (
                  <button
                    key={photo.id}
                    onClick={() => {
                      if (!photo.hasAccess) {
                        if (!requestedPhotos.has(photo.id)) handleRequestPhoto(photo.id);
                      } else {
                        setSelectedPhoto(photo);
                      }
                    }}
                    className="relative aspect-square rounded-lg overflow-hidden group focus:outline-none"
                    disabled={requestedPhotos.has(photo.id) && !photo.hasAccess}
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
                      <div className="absolute inset-0 flex items-center justify-center bg-background/30">
                        {requestedPhotos.has(photo.id) ? (
                          <div className="flex flex-col items-center gap-1 text-foreground">
                            <span className="text-xs font-medium">Solicitado</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-foreground group-hover:scale-110 transition-transform">
                            <Sparkles className="w-5 h-5" />
                            <Lock className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-3 text-center">
              Toque em uma foto para pedir permissao
            </p>
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
            className="relative max-w-full max-h-full aspect-auto rounded-lg overflow-hidden shadow-2xl"
            onContextMenu={(e) => e.preventDefault()} // Prevent right-click save
          >
            {/* Protection Layer - Transparent div on top to intercept interactions if needed, though onContextMenu on parent helps */}
            <img
              src={selectedPhoto.url}
              alt="Foto Expandida"
              className="max-h-[90vh] max-w-[90vw] object-contain select-none"
              style={{
                pointerEvents: 'auto', // Allow clicks if we want zoom later, but block drag
                userSelect: 'none',
                WebkitTouchCallout: 'none'
              }}
              draggable={false}
            />
          </div>
        </div>
      )}
    </>
  )
}
