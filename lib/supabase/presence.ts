import { RealtimeChannel } from '@supabase/supabase-js'
import { getSupabaseClient } from './client'

let globalPresenceChannel: RealtimeChannel | null = null

export const setupPresence = (
    userId: string,
    onPresenceChange: (presenceState: Record<string, any>) => void
) => {
    const supabase = getSupabaseClient()
    if (!supabase) return null

    const channel = supabase.channel('online-users', {
        config: {
            presence: {
                key: userId,
            },
        },
    })

    globalPresenceChannel = channel

    const handleStateChange = () => {
        const state = channel.presenceState()
        onPresenceChange(state)
    }

    channel
        .on('presence', { event: 'sync' }, () => {
            handleStateChange()
        })
        .on('presence', { event: 'join' }, ({ key }) => {
            console.log('User joined:', key)
            handleStateChange()
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
            console.log('User left:', key)
            handleStateChange()
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({
                    online_at: new Date().toISOString(),
                    user_id: userId,
                    isTypingTo: null
                })
            }
        })

    return channel
}

/**
 * Atualiza o status de digitação no canal global
 */
export const updateTypingStatus = async (userId: string, targetUserId: string | null) => {
    if (globalPresenceChannel) {
        await globalPresenceChannel.track({
            online_at: new Date().toISOString(),
            user_id: userId,
            isTypingTo: targetUserId
        })
    }
}
