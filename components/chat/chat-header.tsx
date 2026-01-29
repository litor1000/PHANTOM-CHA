'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, MoreVertical, BellOff, Ban, User, LogOut, CheckCircle, XCircle } from 'lucide-react'
import type { User as UserType } from '@/lib/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ChatHeaderProps {
  user: UserType
  onBack: () => void
  onViewProfile: () => void
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatLastSeen(date?: Date | string): string {
  if (!date) return ''

  // Convert string to Date if needed (happens when loading from localStorage)
  const dateObj = typeof date === 'string' ? new Date(date) : date

  // Check if date is valid
  if (isNaN(dateObj.getTime())) return ''

  const now = new Date()
  const diff = now.getTime() - dateObj.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)

  if (minutes < 1) return 'agora'
  if (minutes < 60) return `ha ${minutes}min`
  if (hours < 24) return `ha ${hours}h`
  return 'ha muito tempo'
}

export function ChatHeader({ user, onBack, onViewProfile }: ChatHeaderProps) {
  const [isMuted, setIsMuted] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const [sessionStatus, setSessionStatus] = useState<'loading' | 'active' | 'inactive'>('loading')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionStatus(session ? 'active' : 'inactive')
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionStatus(session ? 'active' : 'inactive')
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('Logout realizado')
    window.location.reload()
  }

  return (
    <header className="flex items-center gap-2 px-2 py-2 bg-card border-b border-border">
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="shrink-0 text-muted-foreground hover:text-foreground h-9 w-9"
        aria-label="Voltar"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>

      <button
        onClick={onViewProfile}
        className="flex items-center gap-2 flex-1 min-w-0 hover:bg-secondary/50 rounded-lg p-1 -m-1 transition-colors"
      >
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
          <AvatarFallback className="bg-primary/20 text-primary text-sm font-medium">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 text-left">
          <h1 className="font-semibold text-foreground truncate text-sm">{user.name}</h1>
          <p className="text-xs text-muted-foreground">
            {user.isOnline ? (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                online
              </span>
            ) : (
              formatLastSeen(user.lastSeen)
            )}
          </p>
        </div>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground h-9 w-9"
            aria-label="Mais opcoes"
          >
            <MoreVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-card border-border w-48">
          <DropdownMenuItem onClick={onViewProfile} className="gap-2">
            <User className="w-4 h-4" />
            Ver perfil
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2" disabled>
            {sessionStatus === 'active' ? (
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            ) : (
              <XCircle className="w-4 h-4 text-destructive" />
            )}
            Status: {sessionStatus === 'active' ? 'Conectado' : 'Desconectado'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout} className="gap-2 text-destructive focus:text-destructive">
            <LogOut className="w-4 h-4" />
            Sair
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setIsMuted(!isMuted)}
            className="gap-2"
          >
            <BellOff className="w-4 h-4" />
            {isMuted ? 'Ativar notificacoes' : 'Silenciar'}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setIsBlocked(!isBlocked)}
            className="gap-2 text-destructive focus:text-destructive"
          >
            <Ban className="w-4 h-4" />
            {isBlocked ? 'Desbloquear' : 'Bloquear'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
