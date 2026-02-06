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
  wallet_balance?: number
  pix_key?: string
  pix_key_type?: string
  is_blocked?: boolean
  needs_pix_update?: boolean
  fcm_token?: string
}

export interface CurrentUser extends User {
  profilePhoto: string | null
}

export interface WithdrawalRequest {
  id: string
  user_id: string
  user_name: string
  user_nickname: string
  amount: number
  status: 'pending' | 'approved' | 'rejected'
  pix_key: string
  created_at: string
  admin_comment?: string
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
  type: 'text' | 'image' | 'video' | 'audio' | 'request'
  imageUrl?: string
  videoUrl?: string
  audioUrl?: string
  allowedNicknames?: string[]
  metadata?: {
    photoId?: string
    status?: 'pending' | 'accepted' | 'rejected'
    requestType?: 'album' | 'photo'
    // Paid content fields
    price?: number
    isLocked?: boolean
    paymentStatus?: 'pending' | 'paid'
  }
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
