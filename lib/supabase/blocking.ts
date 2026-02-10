
import { getSupabaseClient } from './client'

/**
 * Bloqueia um usuário
 */
export async function blockUser(blockerId: string, blockedId: string): Promise<{ error: string | null }> {
    try {
        const supabase = getSupabaseClient()
        if (!supabase) {
            return { error: 'Supabase não configurado' }
        }

        const { error } = await (supabase
            .from('blocked_users') as any)
            .insert({
                blocker_id: blockerId,
                blocked_id: blockedId
            })

        if (error) {
            if (error.code === '23505') return { error: null } // Já bloqueado
            return { error: error.message }
        }

        return { error: null }
    } catch (error) {
        console.error('Erro ao bloquear usuário:', error)
        return { error: 'Erro ao bloquear usuário' }
    }
}

/**
 * Desbloqueia um usuário
 */
export async function unblockUser(blockerId: string, blockedId: string): Promise<{ error: string | null }> {
    try {
        const supabase = getSupabaseClient()
        if (!supabase) {
            return { error: 'Supabase não configurado' }
        }

        const { error } = await (supabase
            .from('blocked_users') as any)
            .delete()
            .eq('blocker_id', blockerId)
            .eq('blocked_id', blockedId)

        if (error) {
            return { error: error.message }
        }

        return { error: null }
    } catch (error) {
        console.error('Erro ao desbloquear usuário:', error)
        return { error: 'Erro ao desbloquear usuário' }
    }
}

/**
 * Verifica se um usuário está bloqueado pelo outro
 */
export async function isUserBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    try {
        const supabase = getSupabaseClient()
        if (!supabase) return false

        const { data, error } = await (supabase
            .from('blocked_users') as any)
            .select('id')
            .eq('blocker_id', blockerId)
            .eq('blocked_id', blockedId)
            .single()

        if (error || !data) return false
        return true
    } catch (error) {
        return false
    }
}

/**
 * Lista todos os IDs de usuários bloqueados pelo usuário atual
 */
export async function getBlockedUserIds(blockerId: string): Promise<string[]> {
    try {
        const supabase = getSupabaseClient()
        if (!supabase) return []

        const { data, error } = await (supabase
            .from('blocked_users') as any)
            .select('blocked_id')
            .eq('blocker_id', blockerId)

        if (error || !data) return []
        return data.map((item: any) => item.blocked_id)
    } catch (error) {
        return []
    }
}

/**
 * Lista detalhes dos usuários bloqueados (para a tela de configurações)
 */
export async function getBlockedUsersDetailed(blockerId: string): Promise<any[]> {
    try {
        const supabase = getSupabaseClient()
        if (!supabase) return []

        const { data, error } = await (supabase
            .from('blocked_users') as any)
            .select(`
                id,
                blocked_id,
                created_at,
                blocked_user:users!blocked_id (
                    id,
                    nickname,
                    avatar,
                    profile_photo
                )
            `)
            .eq('blocker_id', blockerId)

        if (error || !data) return []

        return data.map((item: any) => ({
            blockId: item.id,
            id: item.blocked_user.id,
            nickname: item.blocked_user.nickname,
            avatar: item.blocked_user.profile_photo || item.blocked_user.avatar,
            blockedAt: item.created_at
        }))
    } catch (error) {
        console.error('Erro ao buscar detalhes de bloqueados:', error)
        return []
    }
}
