
import { getSupabaseClient } from './client'
import type { User } from '../types'


/**
 * Busca usuários para a aba Descobrir com status de relacionamento
 */
export async function getDiscoverUsers(currentUserId: string, limit = 20): Promise<{ data: any[] | null; error: string | null }> {
    try {
        const supabase = getSupabaseClient()
        if (!supabase) return { data: null, error: 'Supabase não configurado' }

        // 1. Buscar usuários aleatórios (excluindo o próprio usuário)
        const { data: users, error: usersError } = await (supabase
            .from('users') as any)
            .select('id, name, nickname, profile_photo, avatar, cover_photo, is_online, wallet_balance')
            .neq('id', currentUserId)
            .limit(limit)
            .order('created_at', { ascending: false })

        if (usersError) throw usersError

        // 2. Buscar contatos do usuário atual para verificar quem já é amigo
        const { data: contacts, error: contactsError } = await (supabase
            .from('contacts') as any)
            .select('contact_id')
            .eq('user_id', currentUserId)

        if (contactsError) throw contactsError
        const contactIds = new Set(contacts.map((c: any) => c.contact_id))

        // 3. Buscar BLOQUEIOS (Quem eu bloqueei e quem me bloqueou)
        const { data: blocks } = await (supabase
            .from('blocked_users') as any)
            .select('blocker_id, blocked_id')
            .or(`blocker_id.eq.${currentUserId},blocked_id.eq.${currentUserId}`)

        const restrictedUserIds = new Set<string>()
        if (blocks) {
            blocks.forEach((b: any) => {
                restrictedUserIds.add(b.blocker_id)
                restrictedUserIds.add(b.blocked_id)
            })
            restrictedUserIds.delete(currentUserId)
        }

        // 4. Buscar solicitações pendentes nas mensagens
        const { data: requests, error: requestsError } = await (supabase
            .from('messages') as any)
            .select('receiver_id, metadata')
            .eq('sender_id', currentUserId)
            .eq('type', 'request')
            .filter('metadata->>requestType', 'eq', 'chat')

        const requestMap = new Map()
        if (!requestsError && requests) {
            requests.forEach((r: any) => {
                requestMap.set(r.receiver_id, r.metadata?.status || 'pending')
            })
        }

        // 5. Mapear status e FILTRAR BLOQUEADOS
        const formattedUsers = users
            .filter((u: any) => !restrictedUserIds.has(u.id))
            .map((u: any) => {
                let status: 'none' | 'pending' | 'accepted' | 'declined' = 'none'

                if (contactIds.has(u.id)) {
                    status = 'accepted'
                } else if (requestMap.has(u.id)) {
                    status = requestMap.get(u.id)
                }

                return {
                    id: u.id,
                    name: u.name,
                    nickname: u.nickname,
                    avatar: u.profile_photo || u.avatar || '',
                    coverPhoto: u.cover_photo,
                    isOnline: u.is_online,
                    wallet_balance: u.wallet_balance,
                    relationship: status
                }
            })

        return { data: formattedUsers, error: null }
    } catch (error: any) {
        console.error('Erro ao buscar usuários do descobrir:', error)
        return { data: null, error: error.message }
    }
}

/**
 * Envia uma solicitação de conversa
 */
export async function sendChatRequest(senderId: string, receiverId: string): Promise<{ data: any; error: string | null }> {
    try {
        const { sendMessage } = await import('./messages')

        const content = '👋 Olá! Gostaria de iniciar uma conversa com você.'
        const metadata = {
            requestType: 'chat',
            status: 'pending'
        }

        return await sendMessage({
            content,
            senderId,
            receiverId,
            type: 'request',
            metadata
        })
    } catch (error: any) {
        return { data: null, error: error.message }
    }
}
