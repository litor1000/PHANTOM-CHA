'use client'

import React from "react"

import { useState, useRef } from 'react'
import {
  X,
  User,
  Camera,
  ImageIcon,
  LogOut,
  Palette,
  Wifi,
  WifiOff,
  Wallet,
  Images,
  ChevronRight,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import type { CurrentUser } from '@/lib/types'
import Image from 'next/image'
import { toast } from 'sonner'

interface SettingsSheetProps {
  isOpen: boolean
  onClose: () => void
  user: CurrentUser
  onUpdateUser: (user: CurrentUser) => void
  onLogout: () => void
  onOpenAlbum: () => void
}

export function SettingsSheet({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  onLogout,
  onOpenAlbum,
}: SettingsSheetProps) {
  const [isOnline, setIsOnline] = useState(user.isOnline ?? true)
  const [themeColor, setThemeColor] = useState<string>('teal')
  const profileInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const colors = [
    { id: 'teal', color: 'bg-teal-500', label: 'Teal' },
    { id: 'blue', color: 'bg-blue-500', label: 'Azul' },
    { id: 'pink', color: 'bg-pink-500', label: 'Rosa' },
    { id: 'orange', color: 'bg-orange-500', label: 'Laranja' },
    { id: 'green', color: 'bg-green-500', label: 'Verde' },
  ]

  // Load theme from local storage
  React.useEffect(() => {
    const savedTheme = localStorage.getItem('phantom-theme')
    if (savedTheme) {
      setThemeColor(savedTheme)
    }
  }, [])

  // Apply theme color
  React.useEffect(() => {
    console.log('Settings: Aplicando tema', themeColor)
    document.documentElement.setAttribute('data-theme', themeColor)
    localStorage.setItem('phantom-theme', themeColor)
    console.log('Settings: data-theme definido como', document.documentElement.getAttribute('data-theme'))
  }, [themeColor])


  const handlePhotoChange = (
    field: 'profilePhoto' | 'coverPhoto',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const photo = reader.result as string
        if (field === 'profilePhoto') {
          onUpdateUser({ ...user, profilePhoto: photo, avatar: photo })
        } else {
          onUpdateUser({ ...user, coverPhoto: photo })
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleOnlineToggle = (checked: boolean) => {
    setIsOnline(checked)
    onUpdateUser({ ...user, isOnline: checked })
  }

  const handleSaveTheme = () => {
    toast.success("Tema aplicado com sucesso!")
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div
        className={cn(
          'fixed inset-y-0 right-0 w-full max-w-sm bg-background border-l border-border shadow-xl',
          'flex flex-col',
          'animate-in slide-in-from-right duration-300'
        )}
      >
        {/* Header with Cover */}
        <div className="relative h-32 bg-gradient-to-br from-primary/30 to-primary/10">
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

          <button
            onClick={() => coverInputRef.current?.click()}
            className="absolute top-3 left-3 w-8 h-8 rounded-full bg-background/50 hover:bg-background/80 flex items-center justify-center transition-colors"
          >
            <ImageIcon className="w-4 h-4 text-foreground" />
          </button>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handlePhotoChange('coverPhoto', e)}
          />

          {/* Profile Photo */}
          <div className="absolute -bottom-10 left-4">
            <button
              onClick={() => profileInputRef.current?.click()}
              className="relative w-20 h-20 rounded-full bg-card border-4 border-background overflow-hidden group"
            >
              {user.profilePhoto ? (
                <Image
                  src={user.profilePhoto || "/placeholder.svg"}
                  alt={user.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-card">
                  <User className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-5 h-5 text-foreground" />
              </div>
            </button>
            <input
              ref={profileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handlePhotoChange('profilePhoto', e)}
            />
          </div>
        </div>

        {/* User Info */}
        <div className="px-4 pt-14 pb-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">{user.name}</h2>
          <p className="text-sm text-muted-foreground">@{user.nickname}</p>
        </div>

        {/* Settings Options */}
        <div className="flex-1 overflow-y-auto">
          {/* Status Online */}
          <div className="px-4 py-3 flex items-center justify-between border-b border-border/50">
            <div className="flex items-center gap-3">
              {isOnline ? (
                <Wifi className="w-5 h-5 text-green-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium text-foreground">Status Online</p>
                <p className="text-xs text-muted-foreground">
                  {isOnline ? 'Voce esta visivel' : 'Voce esta invisivel'}
                </p>
              </div>
            </div>
            <Switch
              checked={isOnline}
              onCheckedChange={handleOnlineToggle}
            />
          </div>

          {/* Album de Fotos */}
          <button
            onClick={onOpenAlbum}
            className="w-full px-4 py-3 flex items-center justify-between border-b border-border/50 hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Images className="w-5 h-5 text-primary" />
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">Album de Fotos</p>
                <p className="text-xs text-muted-foreground">6 fotos com acesso privado</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* Carteira */}
          <button
            className="w-full px-4 py-3 flex items-center justify-between border-b border-border/50 hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5 text-amber-500" />
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">Carteira</p>
                <p className="text-xs text-muted-foreground">0 tokens disponiveis</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* Cor do Tema */}
          <div className="px-4 py-3 border-b border-border/50">
            <div className="flex items-center gap-3 mb-3">
              <Palette className="w-5 h-5 text-primary" />
              <p className="text-sm font-medium text-foreground">Cor do Tema</p>
            </div>
            <div className="flex gap-2">
              {colors.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setThemeColor(c.id)}
                  className={cn(
                    'w-8 h-8 rounded-full transition-all flex items-center justify-center',
                    c.color,
                    themeColor === c.id && 'ring-2 ring-offset-2 ring-offset-background ring-foreground'
                  )}
                  aria-label={c.label}
                >
                  {themeColor === c.id && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                </button>
              ))}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4 w-full"
              onClick={handleSaveTheme}
            >
              Aplicar Tema
            </Button>
          </div>
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-border">
          <Button
            variant="destructive"
            className="w-full"
            onClick={onLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair da conta
          </Button>
        </div>
      </div>
    </div>
  )
}
