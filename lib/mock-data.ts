import type { Conversation, CurrentUser, Message, User } from './types'

export const currentUser: CurrentUser = {
  id: 'current-user',
  name: 'Você',
  nickname: 'voce',
  email: 'voce@email.com',
  phone: '(11) 99999-9999',
  avatar: '',
  profilePhoto: null,
  isOnline: true,
}

export const mockUsers: User[] = [
  {
    id: 'user-1',
    name: 'Ana Silva',
    nickname: 'ana_silva',
    email: 'ana@email.com',
    phone: '(11) 98888-8888',
    avatar: '',
    lastSeen: new Date(Date.now() - 5 * 60 * 1000),
    isOnline: true,
  },
  {
    id: 'user-2',
    name: 'Pedro Costa',
    nickname: 'pedro_costa',
    email: 'pedro@email.com',
    phone: '(11) 97777-7777',
    avatar: '',
    lastSeen: new Date(Date.now() - 30 * 60 * 1000),
    isOnline: false,
  },
  {
    id: 'user-3',
    name: 'Maria Santos',
    nickname: 'maria_santos',
    email: 'maria@email.com',
    phone: '(11) 96666-6666',
    avatar: '',
    lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000),
    isOnline: true,
  },
  {
    id: 'user-4',
    name: 'Lucas Oliveira',
    nickname: 'lucas_oliveira',
    email: 'lucas@email.com',
    phone: '(11) 95555-5555',
    avatar: '',
    lastSeen: new Date(Date.now() - 1 * 60 * 60 * 1000),
    isOnline: false,
  },
]

export const mockMessages: Record<string, Message[]> = {
  'user-1': [
    {
      id: 'msg-1',
      content: 'Oi! Tudo bem?',
      senderId: 'user-1',
      receiverId: 'current-user',
      timestamp: new Date(Date.now() - 10 * 60 * 1000),
      isRead: false,
      isRevealed: false,
      type: 'text',
    },
    {
      id: 'msg-2',
      content: 'Recebi sua mensagem secreta!',
      senderId: 'current-user',
      receiverId: 'user-1',
      timestamp: new Date(Date.now() - 8 * 60 * 1000),
      isRead: true,
      isRevealed: true,
      type: 'text',
    },
    {
      id: 'msg-3',
      content: 'Que legal! O que achou do app?',
      senderId: 'user-1',
      receiverId: 'current-user',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      isRead: false,
      isRevealed: false,
      type: 'text',
    },
  ],
  'user-2': [
    {
      id: 'msg-4',
      content: 'Vamos nos encontrar amanhã?',
      senderId: 'user-2',
      receiverId: 'current-user',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      isRead: false,
      isRevealed: false,
      type: 'text',
    },
  ],
  'user-3': [
    {
      id: 'msg-5',
      content: 'Olha essa foto! Muito legal',
      senderId: 'user-3',
      receiverId: 'current-user',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      isRead: true,
      isRevealed: false,
      type: 'text',
    },
    {
      id: 'msg-6',
      content: 'Nossa, que incrível!',
      senderId: 'current-user',
      receiverId: 'user-3',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
      isRead: true,
      isRevealed: true,
      type: 'text',
    },
  ],
  'user-4': [
    {
      id: 'msg-7',
      content: 'Segredo: a senha é 1234',
      senderId: 'user-4',
      receiverId: 'current-user',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      isRead: false,
      isRevealed: false,
      type: 'text',
    },
  ],
}

export const mockConversations: Conversation[] = mockUsers.map((user) => ({
  id: `conv-${user.id}`,
  user,
  lastMessage: mockMessages[user.id]?.[mockMessages[user.id].length - 1],
  unreadCount: mockMessages[user.id]?.filter(
    (m) => m.senderId !== 'current-user' && !m.isRead
  ).length || 0,
}))
