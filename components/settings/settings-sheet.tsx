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
  Mail,
  Shield,
  ShieldCheck,
  Activity,
  Bell,
  Lock,
  Ban,
  Monitor,
  CreditCard,
  MessageSquare,
  MessageCircle,
  UserCheck,
  DollarSign,
  EyeOff
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { CurrentUser } from '@/lib/types'
import Image from 'next/image'
import { toast } from 'sonner'
import { getBlockedUsersDetailed, unblockUser } from '@/lib/supabase/blocking'

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

  // Sub-views state
  const [activeSubView, setActiveSubView] = useState<string | null>(null)

  const [notifications, setNotifications] = useState({
    messages: true,
    accessRequests: true,
    payments: true
  })

  // Edit Profile States
  const [editName, setEditName] = useState(user.name)
  const [editNickname, setEditNickname] = useState(user.nickname)
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)

  // Blocked users detailed list
  const [blockedUsersDetailed, setBlockedUsersDetailed] = useState<any[]>([])
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false)

  const loadBlockedUsers = async () => {
    setIsLoadingBlocks(true)
    const data = await getBlockedUsersDetailed(user.id)
    setBlockedUsersDetailed(data)
    setIsLoadingBlocks(false)
  }

  const handleUnblock = async (blockedId: string, nickname: string) => {
    const { error } = await unblockUser(user.id, blockedId)
    if (error) {
      toast.error('Erro ao desbloquear')
    } else {
      toast.success(`@${nickname} desbloqueado`)
      setBlockedUsersDetailed(prev => prev.filter(u => u.id !== blockedId))
    }
  }

  React.useEffect(() => {
    if (activeSubView === 'blocked') {
      loadBlockedUsers()
    }
  }, [activeSubView])

  const handleNotificationChange = async (key: keyof typeof notifications, value: boolean) => {
    const newNotifs = { ...notifications, [key]: value }
    setNotifications(newNotifs)
    // Here we could persist to Supabase if we had a notifications table
    toast.success('Preferências de notificação atualizadas')
  }

  const handleUpdateProfileData = async () => {
    setIsUpdatingProfile(true)
    try {
      const { updateUserProfile } = await import('@/lib/supabase/auth')
      const { error } = await updateUserProfile(user.id, { name: editName, nickname: editNickname })
      if (error) throw new Error(error)

      onUpdateUser({ ...user, name: editName, nickname: editNickname })
      toast.success('Perfil atualizado com sucesso!')
      setActiveSubView(null)
    } catch (err: any) {
      toast.error('Erro ao atualizar: ' + err.message)
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const handlePhotoChange = async (
    field: 'profilePhoto' | 'coverPhoto',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const photoData = reader.result as string

        // Optimistic update
        if (field === 'profilePhoto') {
          onUpdateUser({ ...user, profilePhoto: photoData, avatar: photoData })
        } else {
          onUpdateUser({ ...user, coverPhoto: photoData })
        }

        try {
          const { uploadProfilePhoto, uploadCoverPhoto } = await import('@/lib/supabase/storage')
          const { updateUserProfile } = await import('@/lib/supabase/auth')

          let publicUrl = ''
          if (field === 'profilePhoto') {
            publicUrl = await uploadProfilePhoto(user.id, photoData) || ''
            if (publicUrl) {
              await updateUserProfile(user.id, { profilePhoto: publicUrl, avatar: publicUrl })
              onUpdateUser({ ...user, profilePhoto: publicUrl, avatar: publicUrl })
            }
          } else {
            publicUrl = await uploadCoverPhoto(user.id, photoData) || ''
            if (publicUrl) {
              await updateUserProfile(user.id, { coverPhoto: publicUrl })
              onUpdateUser({ ...user, coverPhoto: publicUrl })
            }
          }

          if (publicUrl) {
            toast.success('Foto atualizada com sucesso!')
          }
        } catch (err) {
          console.error(err)
          toast.error('Erro ao salvar foto no servidor')
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleOnlineToggle = async (checked: boolean) => {
    setIsOnline(checked)
    onUpdateUser({ ...user, isOnline: checked })

    try {
      const { updateUserProfile } = await import('@/lib/supabase/auth')
      await updateUserProfile(user.id, { isOnline: checked })
    } catch (err) {
      console.error(err)
    }
  }

  const [tempPixKey, setTempPixKey] = useState(user.pix_key || '')
  const [tempPixKeyType, setTempPixKeyType] = useState(user.pix_key_type || 'CPF')
  const [isSaving, setIsSaving] = useState(false)

  const handleSavePix = async () => {
    setIsSaving(true)
    try {
      const { updateUserProfile } = await import('@/lib/supabase/auth')
      await updateUserProfile(user.id, { pix_key: tempPixKey, pix_key_type: tempPixKeyType })
      onUpdateUser({ ...user, pix_key: tempPixKey, pix_key_type: tempPixKeyType })
      toast.success('Dados de pagamento atualizados!')
    } catch (e) {
      toast.error('Erro ao salvar')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="px-4 py-3 mt-4 first:mt-2 bg-muted/30">
      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{children}</p>
    </div>
  )

  const SettingItem = ({
    icon: Icon,
    label,
    value,
    onClick,
    showChevron = true,
    destructive = false,
    iconColor = "text-muted-foreground"
  }: any) => (
    <button
      onClick={onClick}
      className={cn(
        "w-full px-4 py-4 flex items-center justify-between border-b border-border/40 hover:bg-secondary/30 transition-all active:scale-[0.98]",
        destructive && "text-red-500"
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn("w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center", destructive ? "bg-red-500/10" : "bg-white/5")}>
          <Icon className={cn("w-4 h-4", destructive ? "text-red-500" : iconColor)} />
        </div>
        <div className="text-left">
          <p className="text-sm font-bold tracking-tight">{label}</p>
          {value && <p className="text-[11px] text-muted-foreground font-medium">{value}</p>}
        </div>
      </div>
      {showChevron && <ChevronRight className="w-4 h-4 text-muted-foreground/40" />}
    </button>
  )

  const ToggleItem = ({
    icon: Icon,
    label,
    value,
    checked,
    onChange,
    iconColor = "text-muted-foreground"
  }: any) => (
    <div className="px-4 py-4 flex items-center justify-between border-b border-border/40">
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
          <Icon className={cn("w-4 h-4", iconColor)} />
        </div>
        <div className="text-left">
          <p className="text-sm font-bold tracking-tight">{label}</p>
          {value && <p className="text-[11px] text-muted-foreground font-medium">{value}</p>}
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )

  const SubViewContainer = ({ title, children, onBack }: { title: string, children: React.ReactNode, onBack: () => void }) => (
    <div className="absolute inset-0 bg-zinc-950 z-50 flex flex-col animate-in slide-in-from-right duration-300">
      <div className="flex items-center gap-4 px-4 h-16 border-b border-white/5 bg-zinc-900/50">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
          <ChevronRight className="w-5 h-5 rotate-180" />
        </Button>
        <h3 className="font-black uppercase tracking-widest text-sm">{title}</h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md">
      <div
        className={cn(
          'fixed inset-y-0 right-0 w-full max-w-sm bg-zinc-950 border-l border-white/10 shadow-2xl overflow-hidden',
          'flex flex-col',
          'animate-in slide-in-from-right duration-500 ease-out'
        )}
      >
        {/* Sub-Views Overlay */}
        {activeSubView === 'edit-profile' && (
          <SubViewContainer title="Editar Perfil" onBack={() => setActiveSubView(null)}>
            <div className="p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase px-1">Nome de Exibição</label>
                <input
                  type="text"
                  className="w-full h-12 bg-zinc-900 border border-white/5 rounded-2xl px-4 text-sm font-bold"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase px-1">Seu Apelido (@)</label>
                <input
                  type="text"
                  className="w-full h-12 bg-zinc-900 border border-white/5 rounded-2xl px-4 text-sm font-bold"
                  value={editNickname}
                  onChange={(e) => setEditNickname(e.target.value)}
                />
              </div>
              <Button
                className="w-full h-12 bg-primary text-black font-black uppercase tracking-widest rounded-2xl mt-4"
                onClick={handleUpdateProfileData}
                disabled={isUpdatingProfile}
              >
                {isUpdatingProfile ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </SubViewContainer>
        )}

        {activeSubView === 'blocked' && (
          <SubViewContainer title="Usuários Bloqueados" onBack={() => setActiveSubView(null)}>
            {isLoadingBlocks ? (
              <div className="p-20 flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Carregando...</p>
              </div>
            ) : blockedUsersDetailed.length === 0 ? (
              <div className="p-20 text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto opacity-20">
                  <Ban className="w-10 h-10" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">Nenhum usuário bloqueado no momento.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {blockedUsersDetailed.map((u) => (
                  <div key={u.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 overflow-hidden relative">
                        {u.avatar ? (
                          <Image src={u.avatar} alt={u.nickname} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-5 h-5 text-zinc-700" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold">@{u.nickname}</p>
                        <p className="text-[10px] text-muted-foreground font-medium">Bloqueado em {new Date(u.blockedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10"
                      onClick={() => handleUnblock(u.id, u.nickname)}
                    >
                      Desbloquear
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </SubViewContainer>
        )}

        {activeSubView === 'security' && (
          <SubViewContainer title="Segurança" onBack={() => setActiveSubView(null)}>
            <SectionLabel>Senha</SectionLabel>
            <SettingItem icon={Lock} label="Alterar Senha" value="Última alteração: 3 meses atrás" onClick={() => toast.info('Link para alteração enviado ao seu e-mail')} />

            <SectionLabel>Acesso</SectionLabel>
            <div className="px-4 py-4 space-y-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Monitor className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-sm font-bold">Este Dispositivo (Android)</p>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Sessão Ativa Agora • São Paulo, BR</p>
                  </div>
                </div>
                <Badge className="bg-green-500/20 text-green-500 text-[8px] border-none font-black">ATUAL</Badge>
              </div>
              <Button variant="ghost" className="w-full text-xs text-red-500 font-bold uppercase tracking-widest hover:bg-red-500/5">Encerrar Todas as Outras Sessões</Button>
            </div>
          </SubViewContainer>
        )}

        {activeSubView === 'help' && (
          <SubViewContainer title="Ajuda e Suporte" onBack={() => setActiveSubView(null)}>
            <SectionLabel>Canais de Atendimento</SectionLabel>
            <SettingItem
              icon={MessageSquare}
              label="Chat de Suporte"
              value="IA de Suporte Fantasma"
              iconColor="text-emerald-400"
              onClick={() => {
                const event = new CustomEvent('open-support-chat')
                window.dispatchEvent(event)
                onClose()
              }}
            />
            <SettingItem icon={Mail} label="E-mail de Suporte" value="ajuda@phantomchat.com" onClick={() => window.open('mailto:ajuda@phantomchat.com')} iconColor="text-blue-400" />

            <SectionLabel>FAQ</SectionLabel>
            <SettingItem icon={Info} label="Como funcionam os tokens?" onClick={() => setActiveSubView('how-tokens-work')} />
            <SettingItem icon={Shield} label="Segurança da Rede" onClick={() => setActiveSubView('network-security')} />
          </SubViewContainer>
        )}

        {activeSubView === 'how-tokens-work' && (
          <SubViewContainer title="Tokens" onBack={() => setActiveSubView('help')}>
            <div className="p-6 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20">
                <h3 className="text-primary font-black uppercase text-xs tracking-widest mb-2 flex items-center gap-2">
                  <Wallet className="w-4 h-4" /> Ecossistema Phantom
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Os <span className="text-white font-bold">Tokens (₮)</span> são a moeda oficial da rede. Com eles você pode:
                </p>
                <ul className="mt-4 space-y-3">
                  <li className="flex gap-3 text-sm text-zinc-300">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] shrink-0 font-bold">1</div>
                    Desbloquear fotos e vídeos privados de outros usuários.
                  </li>
                  <li className="flex gap-3 text-sm text-zinc-300">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] shrink-0 font-bold">2</div>
                    Vender seu próprio conteúdo e acumular saldo para saque.
                  </li>
                  <li className="flex gap-3 text-sm text-zinc-300">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] shrink-0 font-bold">3</div>
                    Verificar a autenticidade de usuários premium.
                  </li>
                </ul>
              </div>
              <div className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 text-center">Taxas e Saques</p>
                <p className="text-xs text-zinc-400 text-center italic">
                  A plataforma retém 20% das transações. O saque mínimo é de 50 ₮ via PIX.
                </p>
              </div>
            </div>
          </SubViewContainer>
        )}

        {activeSubView === 'network-security' && (
          <SubViewContainer title="Segurança" onBack={() => setActiveSubView('help')}>
            <div className="p-6 space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                <h4 className="text-white font-bold text-sm mb-1 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" /> Criptografia Efêmera
                </h4>
                <p className="text-zinc-500 text-xs">
                  Todas as mensagens e mídias são deletadas permanentemente após a expiração. Nada fica guardado nos servidores.
                </p>
              </div>
              <div className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                <h4 className="text-white font-bold text-sm mb-1 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> Proteção de Saldo
                </h4>
                <p className="text-zinc-500 text-xs">
                  Seu wallet_balance é protegido por triggers SQL que impedem qualquer alteração externa não autorizada.
                </p>
              </div>
              <div className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                <h4 className="text-white font-bold text-sm mb-1 flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-blue-500" /> Segurança Interna
                </h4>
                <p className="text-zinc-500 text-xs">
                  O painel administrativo utiliza autenticação multinível e hardware keys para gestão da rede.
                </p>
              </div>
            </div>
          </SubViewContainer>
        )}

        {activeSubView === 'terms' && (
          <SubViewContainer title="Termos e Privacidade" onBack={() => setActiveSubView(null)}>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <h4 className="font-black uppercase tracking-tighter text-xs text-primary">Termos de Uso</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  O Phantom Chat é uma plataforma de mensagens efêmeras. Ao usar o app, você concorda que o conteúdo compartilhado em mensagens "Phantom" é deletado permanentemente dos nossos servidores após a expiração.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-black uppercase tracking-tighter text-xs text-primary">Privacidade</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Nós não vendemos seus dados. Suas fotos privadas são criptografadas e só podem ser visualizadas por quem você der permissão explícita.
                </p>
              </div>
            </div>
          </SubViewContainer>
        )}

        {/* Header/Cover Section */}
        <div className="relative h-44 bg-zinc-900 overflow-hidden">
          {(user.coverPhoto || user.avatar) ? (
            <Image
              src={user.coverPhoto || user.avatar || "/placeholder.svg"}
              alt="Capa"
              fill
              className="object-cover opacity-50 contrast-125 saturate-50"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-zinc-900 to-zinc-950" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white rounded-full z-30 transition-all hover:scale-110"
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Cover Edit Button */}
          <button
            onClick={() => coverInputRef.current?.click()}
            className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/40 hover:bg-white text-white hover:text-black flex items-center justify-center transition-all z-30 shadow-lg"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoChange('coverPhoto', e)} />

          {/* Profile Backdrop Area */}
          <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end gap-4 z-20">
            <div className="relative group">
              <button
                onClick={() => profileInputRef.current?.click()}
                className="relative w-24 h-24 rounded-3xl bg-zinc-900 border-4 border-zinc-950 overflow-hidden group shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-transform group-active:scale-95"
              >
                {(user.profilePhoto || user.avatar) ? (
                  <Image src={user.profilePhoto || user.avatar || "/placeholder.svg"} alt={user.name} fill className="object-cover transition-transform group-hover:scale-110" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                    <User className="w-10 h-10 text-zinc-600" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </button>
              <input ref={profileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoChange('profilePhoto', e)} />
            </div>

            <div className="mb-2">
              <h2 className="text-xl font-black text-white tracking-tight leading-none mb-1">{user.name}</h2>
              <p className="text-xs font-bold text-primary/80 uppercase tracking-tighter italic">@{user.nickname}</p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pb-10 custom-scrollbar">

          <SectionLabel>Conta</SectionLabel>
          <SettingItem icon={User} label="Editar Perfil" value="Nome, Nickname, Bio" onClick={() => setActiveSubView('edit-profile')} iconColor="text-blue-400" />
          <SettingItem icon={Mail} label="E-mail" value={user.email} iconColor="text-indigo-400" />
          <SettingItem icon={Images} label="Minhas Fotos" value="Gerenciar álbum privado" onClick={onOpenAlbum} iconColor="text-purple-400" />

          <SectionLabel>Pagamentos</SectionLabel>
          <div className={cn("px-4 py-5 border-b border-white/5", user.needs_pix_update ? "bg-red-500/5" : "bg-zinc-900/20")}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-zinc-800 flex items-center justify-center">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <p className="text-sm font-bold tracking-tight">Chave Pix</p>
              </div>
              {user.needs_pix_update && <Badge className="bg-red-500 text-[8px] px-1.5 h-4 font-black">REJEITADA</Badge>}
            </div>

            <div className="space-y-3">
              <select
                className="w-full h-10 bg-zinc-900 border border-white/5 rounded-xl px-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500/50 appearance-none text-white"
                value={tempPixKeyType}
                onChange={(e) => setTempPixKeyType(e.target.value)}
              >
                <option value="CPF">CPF</option>
                <option value="Email">E-mail</option>
                <option value="Telefone">Telefone</option>
                <option value="Aleatoria">Chave Aleatória (EVP)</option>
              </select>

              <input
                type="text"
                placeholder="Insira sua chave Pix"
                className="w-full h-10 bg-zinc-900 border border-white/5 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-emerald-500/50 text-white"
                value={tempPixKey}
                onChange={(e) => setTempPixKey(e.target.value)}
              />

              <Button
                onClick={handleSavePix}
                className="w-full h-10 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-500/10"
                disabled={isSaving || (tempPixKey === user.pix_key && tempPixKeyType === user.pix_key_type)}
              >
                {isSaving ? 'Salvando...' : 'Salvar Chave Pix'}
              </Button>
            </div>
          </div>
          <SettingItem icon={Wallet} label="Meus Ganhos" value={`₮ ${user.wallet_balance || 0} Disponíveis`} onClick={onOpenWallet} iconColor="text-amber-400" />

          <SectionLabel>Privacidade</SectionLabel>
          <ToggleItem
            icon={isOnline ? Wifi : WifiOff}
            label="Ocultar Atividade"
            value={isOnline ? "Você está visível" : "Modo invisível ativo"}
            checked={!isOnline}
            onChange={(checked: boolean) => handleOnlineToggle(!checked)}
            iconColor={isOnline ? "text-green-500" : "text-muted-foreground"}
          />
          <SettingItem icon={Ban} label="Usuários Bloqueados" onClick={() => setActiveSubView('blocked')} value="0 usuários" iconColor="text-red-400" />

          <SectionLabel>Notificações</SectionLabel>
          <ToggleItem
            icon={MessageSquare}
            label="Mensagens"
            checked={notifications.messages}
            onChange={(c: boolean) => handleNotificationChange('messages', c)}
            iconColor="text-sky-400"
          />
          <ToggleItem
            icon={UserCheck}
            label="Pedido de Acesso"
            checked={notifications.accessRequests}
            onChange={(c: boolean) => handleNotificationChange('accessRequests', c)}
            iconColor="text-pink-400"
          />
          <ToggleItem
            icon={DollarSign}
            label="Pagamentos"
            checked={notifications.payments}
            onChange={(c: boolean) => handleNotificationChange('payments', c)}
            iconColor="text-emerald-400"
          />

          <SectionLabel>Segurança</SectionLabel>
          <SettingItem icon={Lock} label="Segurança da Conta" value="Senha e Sessões" onClick={() => setActiveSubView('security')} iconColor="text-zinc-400" />

          <SectionLabel>Mais</SectionLabel>
          <SettingItem
            icon={Download}
            label="Instalar Aplicativo"
            onClick={() => window.dispatchEvent(new CustomEvent('phantom-open-install-prompt'))}
            iconColor="text-indigo-400"
          />
          <SettingItem icon={Info} label="Central de Ajuda" onClick={() => setActiveSubView('help')} iconColor="text-zinc-500" />
          <SettingItem icon={Shield} label="Termos e Privacidade" onClick={() => setActiveSubView('terms')} iconColor="text-zinc-500" />

          <div className="px-4 py-8">
            <Button
              variant="destructive"
              className="w-full h-12 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 font-black uppercase tracking-[0.2em] rounded-2xl transition-all active:scale-95 group"
              onClick={onLogout}
            >
              <LogOut className="w-4 h-4 mr-3 transition-transform group-hover:-translate-x-1" />
              Sair da conta
            </Button>
            <p className="text-[10px] text-zinc-700 font-bold uppercase tracking-widest text-center mt-6 italic">Phantom Chat v2.4.0</p>
          </div>
        </div>
      </div>
    </div>
  )
}
