import { getSupabaseClient } from './client'
import type { Message } from '../types'

/**
 * Envia uma mensagem para outro usuário
 */
export async function sendMessage(message: {
    content: string
    senderId: string
    receiverId: string
    type?: 'text' | 'image' | 'request'
    imageUrl?: string
    allowedNicknames?: string[]
    expiresIn?: number
    metadata?: any
}): Promise<{ data: Message | null; error: string | null }> {
    try {
        const supabase = getSupabaseClient()
        if (!supabase) {
            return { data: null, error: 'Supabase não configurado' }
        }

        const messageData = {
            content: message.content,
            sender_id: message.senderId,
            receiver_id: message.receiverId,
            type: message.type || 'text',
            image_url: message.imageUrl,
            allowed_nicknames: message.allowedNicknames,
            is_revealed: false, // Sempre começa oculta
            is_read: false,
            expires_in: message.expiresIn || 10, // Padrão: 10 segundos
            metadata: message.metadata // Novo campo
        }

        const { data, error } = await supabase
            .from('messages')
            .insert(messageData)
            .select()
            .single()

        if (error) {
            console.error('Erro ao enviar mensagem:', error)
            return { data: null, error: error.message }
        }

        // Converter para formato do app
        const formattedMessage: Message = {
            id: data.id,
            content: data.content,
            senderId: data.sender_id,
            receiverId: data.receiver_id,
            timestamp: new Date(data.created_at),
            isRead: data.is_read,
            isRevealed: data.is_revealed,
            type: data.type,
            imageUrl: data.image_url,
            allowedNicknames: data.allowed_nicknames,
            expiresIn: data.expires_in,
            metadata: data.metadata,
        }

        return { data: formattedMessage, error: null }
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error)
        return { data: null, error: 'Erro ao enviar mensagem' }
    }
}

/**
 * Carrega mensagens de uma conversa entre dois usuários
 */
/**
 * Carrega mensagens de uma conversa entre dois usuários
 */
export async function loadMessages(
    userId: string,
    otherUserId: string
): Promise<{ data: Message[] | null; error: string | null }> {
    try {
        const supabase = getSupabaseClient()
        if (!supabase) {
            return { data: null, error: 'Supabase não configurado' }
        }

        const now = new Date().toISOString()

        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .or(
                `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`
            )
            .order('created_at', { ascending: true })
        // Filter out expired messages: (expires_at IS NULL OR expires_at > NOW)
        // Note: We do this client-side or via complex query. 
        // supabase-js .or() with nested conditions on top of existing .or() is tricky.
        // Let's filter client-side for simplicity if volume is low, or try to chain filters.

        if (error) {
            console.error('Erro ao carregar mensagens:', error)
            return { data: null, error: error.message }
        }

        // Converter para formato do app e filtrar expiradas
        const messages: Message[] = data
            .filter(msg => {
                if (msg.expires_at) {
                    return new Date(msg.expires_at) > new Date()
                }
                // If revealed but no expires_at (legacy), we keep it or expire it? 
                // Let's keep it consistent: only expire if explicit.
                // Or if the user wants "old messages to disappear", maybe we should hide revealed ones with no date?
                // Let's filter out if is_revealed is true AND expires_at is older than 10s (assumed)
                // For now, strict check on expires_at.
                return true
            })
            .map((msg) => ({
                id: msg.id,
                content: msg.content,
                senderId: msg.sender_id,
                receiverId: msg.receiver_id,
                timestamp: new Date(msg.created_at),
                isRead: msg.is_read,
                isRevealed: msg.is_revealed,
                type: msg.type,
                imageUrl: msg.image_url,
                allowedNicknames: msg.allowed_nicknames,
                expiresIn: msg.expires_in,
                expiresAt: msg.expires_at ? new Date(msg.expires_at) : undefined,
                metadata: msg.metadata,
            }))

        return { data: messages, error: null }
    } catch (error) {
        console.error('Erro ao carregar mensagens:', error)
        return { data: null, error: 'Erro ao carregar mensagens' }
    }
}

/**
 * Marca uma mensagem como revelada e define data de expiração
 */
export async function revealMessage(messageId: string): Promise<{ error: string | null }> {
    try {
        const supabase = getSupabaseClient()
        if (!supabase) {
            return { error: 'Supabase não configurado' }
        }

        // 1. Get current message to know expiresIn
        const { data: msg, error: fetchError } = await supabase
            .from('messages')
            .select('expires_in')
            .eq('id', messageId)
            .single()

        if (fetchError) throw fetchError

        const expiresInSeconds = msg.expires_in || 10
        const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString()

        const { error } = await supabase
            .from('messages')
            .update({
                is_revealed: true,
                is_read: true,
                expires_at: expiresAt
            })
            .eq('id', messageId)

        if (error) {
            console.error('Erro ao revelar mensagem:', error)
            return { error: error.message }
        }

        return { error: null }
    } catch (error) {
        console.error('Erro ao revelar mensagem:', error)
        return { error: 'Erro ao revelar mensagem' }
    }
}

/**
 * Deleta uma mensagem (quando expira)
 */
export async function deleteMessage(messageId: string): Promise<{ error: string | null }> {
    try {
        const supabase = getSupabaseClient()
        if (!supabase) {
            return { error: 'Supabase não configurado' }
        }

        const { error } = await supabase
            .from('messages')
            .delete()
            .eq('id', messageId)

        if (error) {
            console.error('Erro ao deletar mensagem:', error)
            return { error: error.message }
        }

        return { error: null }
    } catch (error) {
        console.error('Erro ao deletar mensagem:', error)
        return { error: 'Erro ao deletar mensagem' }
    }
}

export async function markMessagesAsRead(
    userId: string,
    otherUserId: string
): Promise<{ error: string | null }> {
    try {
        const supabase = getSupabaseClient()
        if (!supabase) {
            return { error: 'Supabase não configurado' }
        }

        const { error } = await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('sender_id', otherUserId)
            .eq('receiver_id', userId)
            .eq('is_read', false)

        if (error) {
            console.error('Erro ao marcar mensagens como lidas:', error)
            return { error: error.message }
        }

        return { error: null }
    } catch (error) {
        console.error('Erro ao marcar mensagens como lidas:', error)
        return { error: 'Erro ao marcar mensagens como lidas' }
    }
}

/**
 * Carrega lista de conversas baseada nas mensagens
 */
export async function getUserConversations(userId: string): Promise<{ data: any[] | null; error: string | null }> {
    try {
        const supabase = getSupabaseClient()
        if (!supabase) {
            return { data: null, error: 'Supabase não configurado' }
        }

        // Buscar últimas 50 mensagens onde o usuário é remetente ou destinatário
        // Incluindo dados dos usuários para montar a conversa
        const { data: messages, error } = await supabase
            .from('messages')
            .select(`
                *,
                sender:sender_id(id, name, nickname, email, phone, avatar, profile_photo, cover_photo, is_online),
                receiver:receiver_id(id, name, nickname, email, phone, avatar, profile_photo, cover_photo, is_online)
            `)
            .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
            .order('created_at', { ascending: false })
            .limit(50)

        if (error) {
            console.error('Erro ao carregar conversas:', error)
            return { data: null, error: error.message }
        }

        const conversationsMap = new Map<string, any>()

        messages.forEach((msg) => {
            const isOwn = msg.sender_id === userId
            const otherUser = isOwn ? msg.receiver : msg.sender

            // Ignorar mensagens de sistema ou usuários inválidos
            if (!otherUser) return

            const otherUserId = otherUser.id

            // Se já processamos esta conversa, apenas atualize contagens se necessário
            // Como ordenamos por data desc, a primeira vez que encontramos um usuário
            // é a mensagem mais recente (lastMessage)
            if (!conversationsMap.has(otherUserId)) {

                // Mapear usuário do banco para tipo User
                const userObj = {
                    id: otherUser.id,
                    name: otherUser.name,
                    nickname: otherUser.nickname,
                    email: otherUser.email,
                    phone: otherUser.phone,
                    avatar: otherUser.avatar,
                    profilePhoto: otherUser.profile_photo, // Mapeando campos extras
                    coverPhoto: otherUser.cover_photo,
                    isOnline: otherUser.is_online
                }

                // Mapear mensagem
                const messageObj = {
                    id: msg.id,
                    content: msg.content,
                    senderId: msg.sender_id,
                    receiverId: msg.receiver_id,
                    timestamp: new Date(msg.created_at),
                    isRead: msg.is_read,
                    isRevealed: msg.is_revealed,
                    type: msg.type,
                    imageUrl: msg.image_url,
                    allowedNicknames: msg.allowed_nicknames,
                    expiresIn: msg.expires_in,
                }

                conversationsMap.set(otherUserId, {
                    id: `conv-${otherUserId}`,
                    user: userObj,
                    lastMessage: messageObj,
                    unreadCount: (!isOwn && !msg.is_read) ? 1 : 0,
                    isGroup: false
                })
            } else {
                // Conversa já existe, apenas incrementar contador se for mensagem não lida
                const conv = conversationsMap.get(otherUserId)
                if (!isOwn && !msg.is_read) {
                    conv.unreadCount += 1
                }
            }
        })

        return { data: Array.from(conversationsMap.values()), error: null }

    } catch (error) {
        console.error('Erro ao buscar conversas:', error)
        return { data: null, error: 'Erro ao buscar conversas' }
    }
}
