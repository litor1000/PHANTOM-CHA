export interface User {
  id: string
  name: string
  nickname: string
  email: string
  phone: string
  avatar: string
  coverPhoto?: string
  lastSeen?: Date
  isOnline?: boolean
}

export interface CurrentUser extends User {
  profilePhoto: string | null
}

export interface Message {
  id: string
  content: string
  senderId: string
  receiverId: string
  timestamp: Date
  isRead: boolean
  isRevealed: boolean
  expiresAt?: Date
  expiresIn?: number
  type: 'text' | 'image'
  imageUrl?: string
  allowedNicknames?: string[]
}

export interface Conversation {
  id: string
  user: User
  lastMessage?: Message
  unreadCount: number
  isGroup?: boolean
  members?: string[]
  pendingMembers?: string[]
  admins?: string[]
}
