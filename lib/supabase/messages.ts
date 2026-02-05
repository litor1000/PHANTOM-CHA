import { getSupabaseClient } from './client'
import type { Message } from '../types'

/**
 * Envia uma mensagem para outro usuário
 */
export async function sendMessage(message: {
    content: string
    senderId: string
    receiverId: string
    type?: 'text' | 'image' | 'video' | 'audio' | 'request'
    imageUrl?: string
    videoUrl?: string
    audioUrl?: string
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
            video_url: message.videoUrl,
            audio_url: message.audioUrl,
            allowed_nicknames: message.allowedNicknames,
            is_revealed: false, // Sempre começa oculta
            is_read: false,
            expires_in: message.expiresIn !== undefined ? message.expiresIn : 10, // Permite 0 (sem expiração)
            metadata: message.metadata // Novo campo
        }

        const { data, error } = await (supabase
            .from('messages') as any)
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
            videoUrl: data.video_url,
            audioUrl: data.audio_url,
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

        const { data, error } = await (supabase
            .from('messages') as any)
            .select('*')
            // Mensagens onde (sender=EU ou receiver=EU) E (sender=OUTRO ou receiver=OUTRO)
            .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
            .or(`sender_id.eq.${otherUserId},receiver_id.eq.${otherUserId}`)
            // Filtro de segurança: não trazer o que já expirou no servidor
            .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
            .order('created_at', { ascending: false })
            .limit(50) // LIMITAR para não dar Timeout

        if (error) {
            console.error('Erro ao carregar mensagens (Load):', JSON.stringify(error, null, 2))
            return { data: null, error: error.message }
        }

        // Converter para formato do app e filtrar expiradas com margem de segurança
        const filteredData = (data as any[]).filter((msg: any) => {
            // Se já tem data de expiração definida, verifica se já passou
            if (msg.expires_at) {
                // Adicionamos uma margem de 1s para evitar flicker
                return new Date(msg.expires_at).getTime() > Date.now() - 1000
            }
            return true
        })

        const messages: Message[] = filteredData.map((msg: any) => ({
            id: msg.id,
            content: msg.content,
            senderId: msg.sender_id,
            receiverId: msg.receiver_id,
            timestamp: new Date(msg.created_at),
            isRead: msg.is_read,
            isRevealed: msg.is_revealed,
            type: msg.type,
            imageUrl: msg.image_url,
            videoUrl: msg.video_url,
            audioUrl: msg.audio_url,
            allowedNicknames: msg.allowed_nicknames,
            expiresIn: msg.expires_in,
            expiresAt: msg.expires_at ? new Date(msg.expires_at) : undefined,
            metadata: msg.metadata,
        })) as Message[]

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
        const { data, error } = await (supabase
            .from('messages') as any)
            .select('*')
            .eq('id', messageId)
            .single()

        if (error || !data) return { error: error?.message || 'Não encontrado' }

        const expiresInSeconds = data.expires_in
        let updateData: any = {
            is_revealed: true,
            is_read: true
        }

        if (expiresInSeconds && expiresInSeconds > 0) {
            const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString()
            updateData.expires_at = expiresAt
        } else {
            // Garante que não tenha data de expiração
            updateData.expires_at = null
        }

        const { error: updateError } = await (supabase
            .from('messages') as any)
            .update(updateData)
            .eq('id', messageId)

        if (updateError) {
            console.error('Erro ao revelar mensagem:', updateError)
            return { error: updateError.message }
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

        const { error } = await (supabase
            .from('messages') as any)
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

        const { error } = await (supabase
            .from('messages') as any)
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

        const { data: messages, error } = await (supabase
            .from('messages') as any)
            .select(`
                *,
                sender:sender_id(id, name, nickname, profile_photo, avatar, is_online),
                receiver:receiver_id(id, name, nickname, profile_photo, avatar, is_online)
            `)
            .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
            .order('created_at', { ascending: false })
            .limit(100)

        if (error) {
            console.error('❌ ERRO CRÍTICO SUPABASE:', error.message)
            console.error('Detahes:', error.details)
            return { data: null, error: error.message }
        }

        const conversationsMap = new Map<string, any>()

        // Filtrar mensagens expiradas antes de processar conversas
        const activeMessages = (messages as any[]).filter((msg: any) => {
            if (msg.expires_at) {
                return new Date(msg.expires_at).getTime() > Date.now()
            }
            return true
        })

        activeMessages.forEach((msg: any) => {
            // Garante que pegamos o objeto correto, tratando se o Supabase retornar como array
            const senderData = Array.isArray(msg.sender) ? msg.sender[0] : msg.sender
            const receiverData = Array.isArray(msg.receiver) ? msg.receiver[0] : msg.receiver

            const isOwn = msg.sender_id === userId
            const otherUser = isOwn ? receiverData : senderData

            // Ignorar mensagens de sistema ou usuários inválidos
            if (!otherUser) return

            const otherUserId = otherUser.id

            // Se já processamos esta conversa, apenas atualize contagens se necessário
            if (!conversationsMap.has(otherUserId)) {

                // Mapear usuário do banco para tipo User
                const userObj = {
                    id: otherUser.id,
                    name: otherUser.name,
                    nickname: otherUser.nickname,
                    email: otherUser.email,
                    phone: otherUser.phone,
                    avatar: otherUser.profile_photo || otherUser.avatar || '',
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
                    unreadCount: (!isOwn && !(msg as any).is_read) ? 1 : 0,
                    isGroup: false
                })
            } else {
                // Conversa já existe, apenas incrementar contador se for mensagem não lida
                const conv = conversationsMap.get(otherUserId)
                if (!isOwn && !(msg as any).is_read) {
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
