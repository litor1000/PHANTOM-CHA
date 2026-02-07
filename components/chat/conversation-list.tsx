'use client'

import { Search, Settings, Ghost, User, MessageCircle, Users, UserPlus, Plus, Check, X as XIcon } from 'lucide-react'
import type { Conversation, CurrentUser, User as UserType } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ConversationItem } from './conversation-item'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"

interface ConversationListProps {
  conversations: Conversation[]
  onSelectConversation: (conversationId: string) => void
  currentUser: CurrentUser
  onUpdateUser: (user: CurrentUser) => void
  onLogout: () => void
  contacts?: UserType[]
  onAddContact?: (nickname: string) => void
  onCreateGroup?: (name: string, members: string[]) => void
  onAcceptInvite?: (groupId: string) => void
  onRejectInvite?: (groupId: string) => void
  onDeleteConversation?: (conversationId: string) => void
  typingUserIds?: string[]
  onOpenSettings: () => void
  onOpenWallet: () => void
}

type TabType = 'chats' | 'contacts' | 'groups'

function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function ConversationList({
  conversations,
  onSelectConversation,
  currentUser,
  onUpdateUser,
  onLogout,
  contacts = [],
  onAddContact,
  onCreateGroup,
  onAcceptInvite,
  onRejectInvite,
  onDeleteConversation,
  typingUserIds = [],
  onOpenSettings,
  onOpenWallet,
}: ConversationListProps) {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('chats')

  const [newContactNickname, setNewContactNickname] = useState('')
  const [searchResults, setSearchResults] = useState<UserType[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Group creation state
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])

  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch = conv.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.user.nickname.toLowerCase().includes(searchQuery.toLowerCase())

    if (activeTab === 'chats') return !conv.isGroup && matchesSearch
    if (activeTab === 'groups') {
      if (!conv.isGroup) return false
      const isMember = conv.members?.includes(currentUser.id) || !conv.members
      const isPending = conv.pendingMembers?.includes(currentUser.id)
      return (isMember || isPending) && matchesSearch
    }
    return false
  })

  const groupInvitesList = activeTab === 'groups'
    ? filteredConversations.filter(c => c.pendingMembers?.includes(currentUser.id))
    : []

  const joinedGroupsList = activeTab === 'groups'
    ? filteredConversations.filter(c => !c.pendingMembers?.includes(currentUser.id))
    : []

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.nickname.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSearchUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newContactNickname.trim()) return

    setIsSearching(true)
    setSearchResults([])

    const { searchUserByNickname } = await import('@/lib/supabase/auth')
    const user = await searchUserByNickname(newContactNickname.trim())

    setIsSearching(false)

    if (user) {
      const alreadyAdded = contacts.some(c => c.id === user.id)
      if (alreadyAdded) {
        toast({
          title: "Já está nos contatos",
          description: `@${user.nickname} já está na sua lista de contatos.`,
        })
        setSearchResults([])
      } else {
        setSearchResults([user])
      }
    } else {
      toast({
        variant: "destructive",
        title: "Usuário não encontrado",
        description: `Não encontramos nenhum usuário com o nickname @${newContactNickname}.`,
      })
      setSearchResults([])
    }
  }

  const handleAddContact = (user: UserType) => {
    if (onAddContact) {
      onAddContact(user.nickname)
      setNewContactNickname('')
      setSearchResults([])
      toast({
        title: "Contato adicionado",
        description: `O usuário @${user.nickname} foi adicionado aos seus contatos.`,
      })
    }
  }

  const handleCreateGroupSubmit = () => {
    if (groupName.trim() && onCreateGroup) {
      onCreateGroup(groupName.trim(), selectedMembers)
      setGroupName('')
      setSelectedMembers([])
      setIsCreateGroupOpen(false)
    }
  }

  const toggleMemberSelection = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const tabs: { id: TabType; label: string; icon: typeof MessageCircle }[] = [
    { id: 'chats', label: 'Chats', icon: MessageCircle },
    { id: 'contacts', label: 'Contatos', icon: Users },
    { id: 'groups', label: 'Grupos', icon: UserPlus },
  ]

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header with Profile */}
      <header className="px-3 py-2 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="relative w-9 h-9 rounded-full bg-card overflow-hidden border-2 border-primary/20 shrink-0">
              {(currentUser.profilePhoto || currentUser.avatar) ? (
                <Image
                  src={currentUser.profilePhoto || currentUser.avatar || "/placeholder.svg"}
                  alt={currentUser.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
              {currentUser.isOnline && (
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-foreground flex items-center gap-1.5">
                <Ghost className="w-4 h-4 text-primary shrink-0" />
                <span className="truncate">Phantom</span>
              </h1>
              <p className="text-xs text-muted-foreground truncate">@{currentUser.nickname}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenSettings}
            className="text-muted-foreground hover:text-foreground h-9 w-9 shrink-0"
            aria-label="Configuracoes"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex-1 flex items-center justify-center gap-1.5 py-3 px-2 rounded-lg text-sm font-semibold transition-all active:scale-95 touch-manipulation z-10',
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.id === 'chats' && conversations.some(c => c.unreadCount > 0) && (
                <span className="absolute top-2 right-2 min-w-[8px] h-[8px] rounded-full bg-red-500 border border-secondary shadow-sm animate-pulse" />
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={activeTab === 'chats' ? 'Buscar conversas...' : activeTab === 'contacts' ? 'Buscar por @nickname...' : 'Buscar grupos...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-secondary border-0 placeholder:text-muted-foreground/60"
          />
        </div>
      </div>

      {/* Content based on active tab */}
      <div className="flex-1 min-h-0 flex flex-col">
        {activeTab === 'chats' && (
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground px-4 py-20">
                <Ghost className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-center">
                  {searchQuery ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/50 pb-20">
                {filteredConversations.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    onClick={() => onSelectConversation(conversation.user.id)}
                    onDelete={onDeleteConversation}
                    isTyping={typingUserIds.includes(conversation.user.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'contacts' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-4 py-2 border-b border-border/50">
              <form onSubmit={handleSearchUser} className="flex gap-2">
                <Input
                  placeholder="Buscar @nickname"
                  value={newContactNickname}
                  onChange={(e) => setNewContactNickname(e.target.value)}
                  className="bg-secondary border-0 h-10"
                />
                <Button type="submit" size="icon" className="h-10 w-10 shrink-0" disabled={!newContactNickname.trim() || isSearching}>
                  {isSearching ? (
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="p-3 bg-secondary/30 border-b border-border">
                  <h3 className="text-[10px] font-bold text-muted-foreground mb-2 px-1 uppercase tracking-widest">Resultado da Busca</h3>
                  {searchResults.map((user) => (
                    <div key={user.id} className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border mb-2 shadow-sm">
                      <Avatar className="w-10 h-10 border border-border/10">
                        <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">@{user.nickname}</p>
                      </div>
                      <Button size="sm" onClick={() => handleAddContact(user)} className="h-8">
                        Adicionar
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {filteredContacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground px-4 py-20">
                  <Users className="h-12 w-12 mb-3 opacity-50" />
                  <p className="text-center font-bold">Seus Contatos</p>
                  <p className="text-center text-xs opacity-60">Adicione amigos pelo nickname</p>
                </div>
              ) : (
                <div className="divide-y divide-border/30 pb-20">
                  {filteredContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center gap-3 p-4 hover:bg-secondary/30 transition-colors active:bg-secondary/50 cursor-pointer"
                      role="button"
                      onClick={() => onSelectConversation(contact.id)}
                    >
                      <div className="relative shrink-0">
                        <Avatar className="w-12 h-12 border border-border/10">
                          <AvatarImage src={contact.avatar || "/placeholder.svg"} alt={contact.name} />
                          <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
                        </Avatar>
                        {contact.isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-foreground truncate">{contact.name}</h3>
                        <p className="text-xs text-muted-foreground truncate">@{contact.nickname}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground">
                        <MessageCircle className="w-5 h-5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'groups' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-4 border-b border-border/50">
              <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 border h-11">
                    <Plus className="w-5 h-5 mr-2" />
                    Criar Novo Grupo
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[90vw] rounded-2xl">
                  <DialogHeader>
                    <DialogTitle>Criar Grupo</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Nome do Grupo</Label>
                      <Input
                        value={groupName}
                        onChange={e => setGroupName(e.target.value)}
                        placeholder="Ex: Amigos da Faculdade"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Selecionar Membros ({selectedMembers.length})</Label>
                      <div className="max-h-60 overflow-y-auto border border-border/50 rounded-xl p-2 space-y-1 bg-secondary/20">
                        {contacts.length === 0 ? (
                          <p className="p-4 text-sm text-center text-muted-foreground">Adicione contatos primeiro.</p>
                        ) : (
                          contacts.map(contact => (
                            <div
                              key={contact.id}
                              className="flex items-center gap-3 p-3 hover:bg-secondary rounded-lg cursor-pointer transition-colors active:bg-secondary"
                              onClick={() => toggleMemberSelection(contact.id)}
                            >
                              <Checkbox
                                id={`member-${contact.id}`}
                                checked={selectedMembers.includes(contact.id)}
                                onCheckedChange={() => toggleMemberSelection(contact.id)}
                              />
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8 border">
                                  <AvatarImage src={contact.avatar || "/placeholder.svg"} />
                                  <AvatarFallback className="text-[10px]">{getInitials(contact.name)}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium">{contact.name}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateGroupSubmit} disabled={!groupName.trim()} className="w-full h-11">Criar Grupo</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {/* Invites Section */}
              {groupInvitesList.length > 0 && (
                <div className="p-3 bg-primary/5 border-b border-primary/10">
                  <h3 className="text-[10px] font-black text-primary mb-2 px-1 uppercase tracking-widest">Convites Pendentes</h3>
                  {groupInvitesList.map(group => (
                    <div key={group.id} className="flex items-center justify-between p-3 bg-background rounded-xl border border-primary/20 mb-2 shadow-sm">
                      <div className="text-sm min-w-0">
                        <span className="font-bold truncate block">{group.user.name}</span>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold opacity-70">Convite de grupo</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          className="h-9 w-9 bg-green-500 text-white hover:bg-green-600 rounded-full"
                          onClick={() => onAcceptInvite?.(group.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 text-red-500 hover:bg-red-500/10 rounded-full"
                          onClick={() => onRejectInvite?.(group.id)}
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex-1">
                {joinedGroupsList.length === 0 && groupInvitesList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground px-4 py-20">
                    <Users className="h-16 w-16 mb-4 opacity-30" />
                    <p className="text-center font-bold">Seus Grupos</p>
                    <p className="text-center text-xs opacity-60">Crie grupos para conversar com várias pessoas</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/30 pb-20">
                    {joinedGroupsList.map((conversation) => (
                      <ConversationItem
                        key={conversation.id}
                        conversation={conversation}
                        onClick={() => onSelectConversation(conversation.user.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
