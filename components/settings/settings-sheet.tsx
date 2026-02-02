'use client'

import React from "react"

import { useState, useRef } from 'react'
import {
  X,
  User,
  Camera,
  ImageIcon,
  LogOut,
  Wifi,
  WifiOff,
  Wallet,
  Images,
  ChevronRight,
  Info,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
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
  onOpenWallet: () => void
}

export function SettingsSheet({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  onLogout,
  onOpenAlbum,
  onOpenWallet,
}: SettingsSheetProps) {
  const [isOnline, setIsOnline] = useState(user.isOnline ?? true)
  const profileInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)


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
    onClose()
  }

  const [tempPixKey, setTempPixKey] = useState(user.pix_key || '')
  const [tempPixKeyType, setTempPixKeyType] = useState(user.pix_key_type || 'CPF')
  const [isSaving, setIsSaving] = useState(false)

  const handleSavePix = async () => {
    setIsSaving(true)
    try {
      await onUpdateUser({ ...user, pix_key: tempPixKey, pix_key_type: tempPixKeyType })
      toast.success('Dados de pagamento atualizados!')
    } catch (e) {
      toast.error('Erro ao salvar')
    } finally {
      setIsSaving(false)
    }
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

          {/* Pix Key Settings */}
          <div className={cn("px-4 py-4 border-b border-border/50", user.needs_pix_update ? "bg-orange-500/10" : "bg-muted/20")}>
            <div className="flex items-center justify-between mb-3 px-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Dados de Pagamento (Recebimento)</p>
              {user.needs_pix_update && <Badge className="bg-orange-500 text-[8px] h-4">AÇÃO NECESSÁRIA</Badge>}
            </div>

            {user.needs_pix_update && (
              <div className="mb-4 p-2 bg-orange-500/20 border border-orange-500/30 rounded-md flex gap-2">
                <Info className="w-4 h-4 text-orange-600 shrink-0" />
                <p className="text-[10px] text-orange-800 leading-tight">
                  Seu último saque foi rejeitado por erro nos dados. Por favor, atualize sua chave Pix e salve para solicitar novamente.
                </p>
              </div>
            )}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground px-1">Tipo de Chave Pix</label>
                <select
                  className="w-full h-9 bg-background border border-border rounded-md px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={tempPixKeyType}
                  onChange={(e) => setTempPixKeyType(e.target.value)}
                >
                  <option value="CPF">CPF</option>
                  <option value="Email">E-mail</option>
                  <option value="Telefone">Telefone</option>
                  <option value="Aleatoria">Chave Aleatória (EVP)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground px-1">Chave Pix</label>
                <input
                  type="text"
                  placeholder="Sua chave pix aqui"
                  className="w-full h-9 bg-background border border-border rounded-md px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={tempPixKey}
                  onChange={(e) => setTempPixKey(e.target.value)}
                />
              </div>

              <Button
                onClick={handleSavePix}
                className="w-full h-8 text-xs bg-primary hover:bg-primary/90"
                disabled={isSaving || (tempPixKey === user.pix_key && tempPixKeyType === user.pix_key_type)}
              >
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>

              <p className="text-[10px] text-muted-foreground px-1 italic">
                * Mantenha atualizado para receber seus pagamentos.
              </p>
            </div>
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
                <p className="text-xs text-muted-foreground">Gerenciar minhas fotos privadas</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* Carteira */}
          <button
            onClick={onOpenWallet}
            className="w-full px-4 py-3 flex items-center justify-between border-b border-border/50 hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5 text-amber-500" />
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">Carteira</p>
                <p className="text-xs text-muted-foreground">{user.wallet_balance || 0} tokens disponiveis</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* Instalar Aplicativo */}
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('phantom-open-install-prompt'))
            }}
            className="w-full px-4 py-3 flex items-center justify-between border-b border-border/50 hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-indigo-500" />
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">Instalar Aplicativo</p>
                <p className="text-xs text-muted-foreground">Usar o Phantom como um App</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* Cor do Tema removida */}
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
