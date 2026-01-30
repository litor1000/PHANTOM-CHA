import { getSupabaseClient } from './client'
import type { Message } from '../types'

/**
 * Envia uma mensagem para outro usuário
 */
export async function sendMessage(message: {
    content: string
    senderId: string
    receiverId: string
    type?: 'text' | 'image'
    imageUrl?: string
    allowedNicknames?: string[]
    expiresIn?: number
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
export async function loadMessages(
    userId: string,
    otherUserId: string
): Promise<{ data: Message[] | null; error: string | null }> {
    try {
        const supabase = getSupabaseClient()
        if (!supabase) {
            return { data: null, error: 'Supabase não configurado' }
        }

        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .or(
                `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`
            )
            .order('created_at', { ascending: true })

        if (error) {
            console.error('Erro ao carregar mensagens:', error)
            return { data: null, error: error.message }
        }

        // Converter para formato do app
        const messages: Message[] = data.map((msg) => ({
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
        }))

        return { data: messages, error: null }
    } catch (error) {
        console.error('Erro ao carregar mensagens:', error)
        return { data: null, error: 'Erro ao carregar mensagens' }
    }
}

/**
 * Marca uma mensagem como revelada
 */
export async function revealMessage(messageId: string): Promise<{ error: string | null }> {
    try {
        const supabase = getSupabaseClient()
        if (!supabase) {
            return { error: 'Supabase não configurado' }
        }

        const { error } = await supabase
            .from('messages')
            .update({
                is_revealed: true,
                is_read: true,
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

/**
 * Marca mensagens como lidas
 */
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
