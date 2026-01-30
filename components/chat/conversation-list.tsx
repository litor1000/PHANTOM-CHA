'use client'

import { Search, Settings, Ghost, User, MessageCircle, Users, UserPlus, Plus, Check, X as XIcon } from 'lucide-react'
import type { Conversation, CurrentUser, User as UserType } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConversationItem } from './conversation-item'
import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { SettingsSheet } from '@/components/settings/settings-sheet'
import { PhotoAlbum, type AlbumPhoto, type PhotoRequest } from '@/components/profile/photo-album'
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
}

type TabType = 'chats' | 'contacts' | 'groups'

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
}: ConversationListProps) {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('chats')
  const [showSettings, setShowSettings] = useState(false)
  const [showAlbum, setShowAlbum] = useState(false)
  const [albumPhotos, setAlbumPhotos] = useState<AlbumPhoto[]>([])
  const [newContactNickname, setNewContactNickname] = useState('')
  const [searchResults, setSearchResults] = useState<UserType[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Group creation state
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])

  // Invites state (mock)
  const [groupInvites, setGroupInvites] = useState<{ id: string, groupName: string, inviter: string }[]>([])
  const [photoRequests, setPhotoRequests] = useState<PhotoRequest[]>([])

  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch = conv.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.user.nickname.toLowerCase().includes(searchQuery.toLowerCase())

    if (activeTab === 'chats') return !conv.isGroup && matchesSearch
    if (activeTab === 'groups') {
      if (!conv.isGroup) return false
      // Show if user is member OR pending member
      const isMember = conv.members?.includes(currentUser.id) || !conv.members // fallback for mocks
      const isPending = conv.pendingMembers?.includes(currentUser.id)
      return (isMember || isPending) && matchesSearch
    }
    return false
  })

  // Separate invites from joined groups
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

    // Import searchUserByNickname dynamically
    const { searchUserByNickname } = await import('@/lib/supabase/auth')
    const user = await searchUserByNickname(newContactNickname.trim())

    setIsSearching(false)

    if (user) {
      // Check if already in contacts
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
      const result = onAddContact(user.nickname)
      const success = typeof result === 'boolean' ? result : true
      if (success) {
        setNewContactNickname('')
        setSearchResults([])
        toast({
          title: "Contato adicionado",
          description: `O usuário @${user.nickname} foi adicionado aos seus contatos.`,
        })
      }
    }
  }

  const handleCreateGroupSubmit = () => {
    if (groupName.trim() && onCreateGroup) {
      onCreateGroup(groupName.trim(), selectedMembers)
      setGroupName('')
      setSelectedMembers([])
      setIsCreateGroupOpen(false)
      // Mock invite for demo purposes if needed
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

  const handleApproveRequest = (requestId: string) => {
    setPhotoRequests((prev) => prev.filter((r) => r.id !== requestId))
  }

  const handleRejectRequest = (requestId: string) => {
    setPhotoRequests((prev) => prev.filter((r) => r.id !== requestId))
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header with Profile */}
      <header className="px-3 py-2 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="relative w-9 h-9 rounded-full bg-card overflow-hidden border-2 border-primary/20 shrink-0">
              {currentUser.profilePhoto ? (
                <Image
                  src={currentUser.profilePhoto || "/placeholder.svg"}
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
            onClick={() => setShowSettings(true)}
            className="text-muted-foreground hover:text-foreground h-9 w-9 shrink-0"
            aria-label="Configuracoes"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary/50 p-1 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all',
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.id === 'chats' && conversations.some(c => c.unreadCount > 0) && (
                <span className="absolute top-1 right-2 min-w-[6px] h-[6px] rounded-full bg-red-500 animate-pulse" />
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
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'chats' && (
          <>
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground px-4">
                <Ghost className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-center">
                  {searchQuery ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {filteredConversations.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    onClick={() => onSelectConversation(conversation.user.id)}
                    onDelete={onDeleteConversation}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'contacts' && (
          <div className="flex flex-col h-full">
            <div className="p-3 border-b border-border">
              <form onSubmit={handleSearchUser} className="flex gap-2">
                <Input
                  placeholder="Buscar @nickname"
                  value={newContactNickname}
                  onChange={(e) => setNewContactNickname(e.target.value)}
                  className="bg-secondary border-0"
                />
                <Button type="submit" size="icon" disabled={!newContactNickname.trim() || isSearching}>
                  {isSearching ? (
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="p-3 bg-secondary/30 border-b border-border">
                <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-1">RESULTADO DA BUSCA</h3>
                {searchResults.map((user) => (
                  <div key={user.id} className="flex items-center gap-3 p-3 bg-card rounded-md border border-border">
                    <div className="relative w-10 h-10 rounded-full bg-secondary overflow-hidden border border-border">
                      {user.avatar ? (
                        <div className="w-full h-full flex items-center justify-center text-2xl">
                          {user.avatar}
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      {user.isOnline && (
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-foreground truncate">{user.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">@{user.nickname}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddContact(user)}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {filteredContacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground px-4 py-8">
                  <Users className="h-12 w-12 mb-3 opacity-50" />
                  <p className="text-center font-medium mb-1">Seus contatos</p>
                  <p className="text-center text-sm">Adicione amigos pelo nickname</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {filteredContacts.map((contact) => (
                    <div key={contact.id} className="flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors">
                      <div className="relative w-10 h-10 rounded-full bg-card overflow-hidden border border-border">
                        {contact.avatar ? (
                          <div className="w-full h-full flex items-center justify-center text-2xl">
                            {contact.avatar}
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        {contact.isOnline && (
                          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-foreground truncate">{contact.name}</h3>
                        <p className="text-xs text-muted-foreground truncate">@{contact.nickname}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => onSelectConversation(contact.id)}>
                        <MessageCircle className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'groups' && (
          <div className="flex flex-col h-full">
            <div className="p-3 border-b border-border">
              <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-primary/10 hover:bg-primary/20 text-primary border-0">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Novo Grupo
                  </Button>
                </DialogTrigger>
                <DialogContent>
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
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Selecionar Membros ({selectedMembers.length})</Label>
                      <div className="max-h-48 overflow-y-auto border rounded-md p-1">
                        {contacts.length === 0 ? (
                          <p className="p-2 text-sm text-muted-foreground">Adicione contatos primeiro.</p>
                        ) : (
                          contacts.map(contact => (
                            <div
                              key={contact.id}
                              className="flex items-center gap-2 p-2 hover:bg-secondary rounded cursor-pointer"
                              onClick={() => toggleMemberSelection(contact.id)}
                            >
                              <Checkbox
                                checked={selectedMembers.includes(contact.id)}
                                onCheckedChange={() => toggleMemberSelection(contact.id)}
                              />
                              <span className="text-sm">{contact.name}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateGroupSubmit} disabled={!groupName.trim()}>Criar Grupo</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Invites Section */}
            {groupInvitesList.length > 0 && (
              <div className="p-3 bg-secondary/30 border-b border-border">
                <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-1">CONVITES PENDENTES</h3>
                {groupInvitesList.map(group => (
                  <div key={group.id} className="flex items-center justify-between p-2 bg-card rounded-md border border-border mb-2">
                    <div className="text-sm">
                      <span className="font-bold">{group.user.name}</span>
                      <p className="text-xs text-muted-foreground">Você foi convidado para participar</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                        onClick={() => onAcceptInvite?.(group.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        onClick={() => onRejectInvite?.(group.id)}
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {joinedGroupsList.length === 0 && groupInvitesList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground px-4 py-8">
                  <Users className="h-12 w-12 mb-3 opacity-50" />
                  <p className="text-center font-medium mb-1">Seus Grupos</p>
                  <p className="text-center text-sm">Crie grupos para conversar com várias pessoas</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
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
        )}
      </div>

      {/* Settings Sheet */}
      <SettingsSheet
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        user={currentUser}
        onUpdateUser={onUpdateUser}
        onLogout={onLogout}
        onOpenAlbum={() => {
          setShowSettings(false)
          setShowAlbum(true)
        }}
      />

      {/* Photo Album */}
      <PhotoAlbum
        isOpen={showAlbum}
        onClose={() => setShowAlbum(false)}
        photos={albumPhotos}
        onUpdatePhotos={setAlbumPhotos}
        pendingRequests={photoRequests}
        onApproveRequest={handleApproveRequest}
        onRejectRequest={handleRejectRequest}
      />
    </div>
  )
}
