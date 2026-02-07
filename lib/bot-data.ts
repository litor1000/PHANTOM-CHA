import type { Conversation, Message, User } from './types'

export const TUTORIAL_BOT_ID = 'bot-tutorial'

export const TUTORIAL_BOT: User = {
  id: TUTORIAL_BOT_ID,
  name: 'Tutorial Bot',
  nickname: 'tutorial',
  email: 'tutorial@phantom.chat',
  phone: '',
  avatar: '🤖',
  isOnline: true,
}

// Tutorial stages messages
export const TUTORIAL_MESSAGES = {
  // Stage 1: Initial greeting (revealed immediately)
  greeting: {
    id: 'tutorial-greeting',
    content: '👋 Olá! Eu sou o Tutorial Bot!\n\nEstou aqui para te ensinar como funciona o Phantom Chat.\n\nSuas mensagens aqui são SECRETAS e ficam ofuscadas até você revelar.',
    senderId: TUTORIAL_BOT_ID,
    receiverId: 'current-user',
    timestamp: new Date(),
    isRead: false,
    isRevealed: true, // This one is shown immediately
    type: 'text' as const,
  },

  // Stage 2: Instructions for test message
  instructions: {
    id: 'tutorial-instructions',
    content: '� Agora vou te enviar uma mensagem OFUSCADA de teste.\n\nPara visualizar, você deve TOCAR E SEGURAR em cima dela por alguns segundos.\n\nApós revelar, ela ficará visível por apenas 5 segundos e depois sumirá! ⏱️\n\nEstá pronto(a)? Aqui vai...',
    senderId: TUTORIAL_BOT_ID,
    receiverId: 'current-user',
    timestamp: new Date(),
    isRead: false,
    isRevealed: true,
    type: 'text' as const,
  },

  // Stage 3: Test message (obfuscated)
  testMessage: {
    id: 'tutorial-test-message',
    content: '🎯 Parabéns! Você conseguiu revelar a mensagem secreta!\n\nViu como é simples? Agora ela vai sumir em 5 segundos... 😄',
    senderId: TUTORIAL_BOT_ID,
    receiverId: 'current-user',
    timestamp: new Date(),
    isRead: false,
    isRevealed: false,
    expiresIn: 5,
    type: 'text' as const,
  },

  // Stage 4: Congratulations (sent after test message expires)
  congratulations: {
    id: 'tutorial-congratulations',
    content: '🎉 Parabéns!\n\n✨ Você completou o tutorial com sucesso!\n\nSeja bem-vindo(a) ao Phantom Chat!\n\nAgora você pode adicionar contatos usando @ e começar a enviar mensagens secretas.\n\nAté mais! 👋👻',
    senderId: TUTORIAL_BOT_ID,
    receiverId: 'current-user',
    timestamp: new Date(),
    isRead: false,
    isRevealed: true,
    type: 'text' as const,
  },
}

export function createTutorialConversation(): Conversation {
  return {
    id: `conv-${TUTORIAL_BOT_ID}`,
    user: TUTORIAL_BOT,
    lastMessage: TUTORIAL_MESSAGES.greeting,
    unreadCount: 1,
  }
}

export const SUPPORT_BOT_ID = 'bot-support'

export const SUPPORT_BOT: User = {
  id: SUPPORT_BOT_ID,
  name: 'Suporte Fantasma',
  nickname: 'suporte',
  email: 'suporte@phantom.chat',
  phone: '',
  avatar: '🛡️',
  isOnline: true,
}

export function createSupportConversation(): Conversation {
  return {
    id: `conv-${SUPPORT_BOT_ID}`,
    user: SUPPORT_BOT,
    lastMessage: {
      id: 'support-initial',
      content: '🤖 Olá! Eu sou o assistente virtual do Phantom Chat.\n\nComo posso te ajudar hoje? Você pode perguntar sobre Tokens, Segurança ou como usar o app.',
      senderId: SUPPORT_BOT_ID,
      receiverId: 'current-user',
      timestamp: new Date(),
      isRead: false,
      isRevealed: true,
      type: 'text'
    },
    unreadCount: 1,
  }
}
