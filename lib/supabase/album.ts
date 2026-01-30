
import { getSupabaseClient } from './client'

export interface AlbumPhoto {
    id: string
    url: string
    isBlurred: boolean
}

/**
 * Uploads a photo to the user's album
 */
export async function uploadAlbumPhoto(userId: string, file: File): Promise<{ data: AlbumPhoto | null; error: string | null }> {
    try {
        const supabase = getSupabaseClient()
        if (!supabase) return { data: null, error: 'Supabase não configurado' }

        // 1. Upload file to storage
        const fileExt = file.name.split('.').pop()
        const fileName = `${userId}/${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
            .from('album-photos')
            .upload(fileName, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
            .from('album-photos')
            .getPublicUrl(fileName)

        // 2. Insert record into user_albums table
        const { data: albumRecord, error: dbError } = await supabase
            .from('user_albums')
            .insert({
                user_id: userId,
                url: publicUrl
            })
            .select()
            .single()

        if (dbError) throw dbError

        return {
            data: {
                id: albumRecord.id,
                url: albumRecord.url,
                isBlurred: true // Default state for UI
            },
            error: null
        }

    } catch (error: any) {
        console.error('Erro ao fazer upload da foto:', error)
        return { data: null, error: error.message || 'Erro desconhecido' }
    }
}

/**
 * Gets all photos from a user's album
 */
export async function getUserAlbum(userId: string): Promise<{ data: AlbumPhoto[] | null; error: string | null }> {
    try {
        const supabase = getSupabaseClient()
        if (!supabase) return { data: null, error: 'Supabase não configurado' }

        const { data: { user: currentUser } } = await supabase.auth.getUser()
        const currentUserId = currentUser?.id

        const { data, error } = await supabase
            .from('user_albums')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (error) throw error

        const photos: AlbumPhoto[] = data.map((item: any) => {
            // Check permissions
            const allowedViewers = item.allowed_viewers || []
            const isOwner = currentUserId === item.user_id
            const hasAccess = isOwner || (currentUserId && allowedViewers.includes(currentUserId))

            return {
                id: item.id,
                url: item.url,
                isBlurred: !hasAccess // Blur if no access
            }
        })

        return { data: photos, error: null }
    } catch (error: any) {
        console.error('Erro ao buscar álbum:', error)
        return { data: null, error: error.message }
    }
}

/**
 * Deletes a photo from the album
 */
export async function deleteAlbumPhoto(photoId: string): Promise<{ error: string | null }> {
    try {
        const supabase = getSupabaseClient()
        if (!supabase) return { error: 'Supabase não configurado' }

        // We should ideally also delete from storage, but for now just deleting the DB record is enough to hide it.
        // To delete from storage effectively we'd need the path, which we can extract from URL or store separately.
        // For simplicity in this iteration, we just remove the DB reference.

        const { error } = await supabase
            .from('user_albums')
            .delete()
            .eq('id', photoId)

        if (error) throw error

        return { error: null }

    } catch (error: any) {
        console.error('Erro ao deletar foto:', error)
        return { error: error.message }
    }
}

/**
 * Grant access to a photo for a user
 */
export async function grantPhotoAccess(photoId: string, userIdToGrant: string): Promise<{ error: string | null }> {
    try {
        const supabase = getSupabaseClient()
        if (!supabase) return { error: 'Supabase não configurado' }

        // Fetch current allowed_viewers
        const { data: photo, error: fetchError } = await supabase
            .from('user_albums')
            .select('allowed_viewers')
            .eq('id', photoId)
            .single()

        if (fetchError) throw fetchError

        const currentViewers = photo.allowed_viewers || []
        if (currentViewers.includes(userIdToGrant)) {
            return { error: null } // Already granted
        }

        const updatedViewers = [...currentViewers, userIdToGrant]

        const { error: updateError } = await supabase
            .from('user_albums')
            .update({ allowed_viewers: updatedViewers })
            .eq('id', photoId)

        if (updateError) throw updateError

        return { error: null }
    } catch (error: any) {
        console.error('Erro ao conceder acesso:', error)
        return { error: error.message }
    }
}
