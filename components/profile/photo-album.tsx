'use client'

import React from "react"

import { useState, useRef } from 'react'
import { X, Plus, Lock, Sparkles, Check, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface PhotoAlbumProps {
  isOpen: boolean
  onClose: () => void
  photos: AlbumPhoto[]
  onUpdatePhotos: (photos: AlbumPhoto[]) => void
  pendingRequests: PhotoRequest[]
  onApproveRequest: (requestId: string) => void
  onRejectRequest: (requestId: string) => void
  onUploadPhoto?: (file: File) => Promise<AlbumPhoto | null>
  onDeletePhoto?: (photoId: string) => Promise<void>
}

export interface AlbumPhoto {
  id: string
  url: string
  isBlurred: boolean
}

export interface PhotoRequest {
  id: string
  photoId: string
  userId: string
  userName: string
  userAvatar?: string
  timestamp: Date
}

export function PhotoAlbum({
  isOpen,
  onClose,
  photos,
  onUpdatePhotos,
  pendingRequests,
  onApproveRequest,
  onRejectRequest,
  onUploadPhoto,
  onDeletePhoto,
}: PhotoAlbumProps) {
  const [activeTab, setActiveTab] = useState<'album' | 'requests'>('album')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && photos.length < 6) {
      if (onUploadPhoto) {
        setIsUploading(true)
        const newPhoto = await onUploadPhoto(file)
        setIsUploading(false)
        if (newPhoto) {
          onUpdatePhotos([...photos, newPhoto])
        }
      } else {
        // Local fallback
        const reader = new FileReader()
        reader.onloadend = () => {
          const newPhoto: AlbumPhoto = {
            id: `photo-${Date.now()}`,
            url: reader.result as string,
            isBlurred: true,
          }
          onUpdatePhotos([...photos, newPhoto])
        }
        reader.readAsDataURL(file)
      }
    }
  }

  const handleRemovePhoto = async (photoId: string) => {
    if (onDeletePhoto) {
      await onDeletePhoto(photoId)
    }
    onUpdatePhotos(photos.filter((p) => p.id !== photoId))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div
        className={cn(
          'fixed inset-y-0 right-0 w-full max-w-md bg-background border-l border-border shadow-xl',
          'flex flex-col',
          'animate-in slide-in-from-right duration-300'
        )}
      >
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Album de Fotos</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </header>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('album')}
            className={cn(
              'flex-1 py-3 text-sm font-medium transition-colors',
              activeTab === 'album'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Minhas Fotos ({photos.length}/6)
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={cn(
              'flex-1 py-3 text-sm font-medium transition-colors relative',
              activeTab === 'requests'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Pedidos
            {pendingRequests.length > 0 && (
              <span className="absolute top-2 right-4 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'album' && (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Suas fotos ficam ofuscadas. Outros usuarios podem pedir permissao para ve-las.
              </p>

              <div className="grid grid-cols-2 gap-3">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden group">
                    <Image
                      src={photo.url || "/placeholder.svg"}
                      alt="Foto do album"
                      fill
                      className={cn(
                        'object-cover transition-all',
                        photo.isBlurred && 'blur-xl'
                      )}
                    />
                    {photo.isBlurred && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/20">
                        <div className="flex flex-col items-center gap-1 text-foreground">
                          <Sparkles className="w-6 h-6" />
                          <Lock className="w-4 h-4" />
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => handleRemovePhoto(photo.id)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {photos.length < 6 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? (
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Plus className="w-8 h-8" />
                    )}
                    <span className="text-xs">{isUploading ? 'Enviando...' : 'Adicionar'}</span>
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAddPhoto}
              />
            </>
          )}

          {activeTab === 'requests' && (
            <>
              {pendingRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                  <Lock className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-center">Nenhum pedido pendente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {request.userName[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {request.userName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Quer ver sua foto
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => onRejectRequest(request.id)}
                        >
                          <XIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onApproveRequest(request.id)}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
