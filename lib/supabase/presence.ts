import { RealtimeChannel } from '@supabase/supabase-js'
import { getSupabaseClient } from './client'

let globalPresenceChannel: RealtimeChannel | null = null
let currentIsVisible = true

export const setupPresence = (
    userId: string,
    isVisible: boolean,
    onPresenceChange: (presenceState: Record<string, any>) => void
) => {
    const supabase = getSupabaseClient()
    if (!supabase) return null

    // Cleanup previous channel if exists
    if (globalPresenceChannel) {
        globalPresenceChannel.unsubscribe()
    }

    const channel = supabase.channel('online-users', {
        config: {
            presence: {
                key: userId,
            },
        },
    })

    globalPresenceChannel = channel
    currentIsVisible = isVisible

    const handleStateChange = () => {
        const state = channel.presenceState()
        onPresenceChange(state)
    }

    channel
        .on('presence', { event: 'sync' }, () => {
            handleStateChange()
        })
        .on('presence', { event: 'join' }, ({ key }) => {
            handleStateChange()
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
            handleStateChange()
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED' && isVisible) {
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
    if (globalPresenceChannel && currentIsVisible) {
        await globalPresenceChannel.track({
            online_at: new Date().toISOString(),
            user_id: userId,
            isTypingTo: targetUserId
        })
    }
}
