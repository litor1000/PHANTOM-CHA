
import { getSupabaseClient } from './client'
import type { User } from '../types'

/**
 * Adiciona um contato para o usuário atual
 */
export async function addContact(userId: string, contactNickname: string): Promise<{ data: User | null; error: string | null }> {
    try {
        const supabase = getSupabaseClient()
        if (!supabase) {
            return { data: null, error: 'Supabase não configurado' }
        }

        // 1. Buscar o usuário pelo nickname
        const { data: contactUser, error: searchError } = await supabase
            .from('users')
            .select('*')
            .eq('nickname', contactNickname.toLowerCase())
            .single()

        if (searchError || !contactUser) {
            return { data: null, error: 'Usuário não encontrado' }
        }

        if (contactUser.id === userId) {
            return { data: null, error: 'Você não pode adicionar a si mesmo' }
        }

        // 2. Criar relacionamento na tabela contacts
        const { error: insertError } = await supabase
            .from('contacts')
            .insert({
                user_id: userId,
                contact_id: contactUser.id
            })

        if (insertError) {
            if (insertError.code === '23505') { // Unique violation
                return { data: null, error: 'Contato já adicionado' }
            }
            return { data: null, error: insertError.message }
        }

        // 3. Retornar dados do usuário adicionado
        const newUser: User = {
            id: contactUser.id,
            name: contactUser.name,
            nickname: contactUser.nickname,
            email: contactUser.email,
            phone: contactUser.phone,
            avatar: contactUser.avatar || '',
            coverPhoto: contactUser.cover_photo,
            isOnline: contactUser.is_online,
            lastSeen: contactUser.last_seen ? new Date(contactUser.last_seen) : undefined
        }

        return { data: newUser, error: null }
    } catch (error) {
        console.error('Erro ao adicionar contato:', error)
        return { data: null, error: 'Erro ao adicionar contato' }
    }
}

/**
 * Busca todos os contatos do usuário
 */
export async function getContacts(userId: string): Promise<{ data: User[] | null; error: string | null }> {
    try {
        const supabase = getSupabaseClient()
        if (!supabase) {
            return { data: null, error: 'Supabase não configurado' }
        }

        const { data, error } = await supabase
            .from('contacts')
            .select(`
        contact:contact_id (*)
      `)
            .eq('user_id', userId)

        if (error) {
            return { data: null, error: error.message }
        }

        const contacts: User[] = data.map((item: any) => ({
            id: item.contact.id,
            name: item.contact.name,
            nickname: item.contact.nickname,
            email: item.contact.email,
            phone: item.contact.phone,
            avatar: item.contact.avatar || '',
            coverPhoto: item.contact.cover_photo,
            isOnline: item.contact.is_online,
            lastSeen: item.contact.last_seen ? new Date(item.contact.last_seen) : undefined
        }))

        return { data: contacts, error: null }
    } catch (error) {
        console.error('Erro ao buscar contatos:', error)
        return { data: null, error: 'Erro ao buscar contatos' }
    }
}

/**
 * Remove um contato
 */
export async function removeContact(userId: string, contactId: string): Promise<{ error: string | null }> {
    try {
        const supabase = getSupabaseClient()
        if (!supabase) {
            return { error: 'Supabase não configurado' }
        }

        const { error } = await supabase
            .from('contacts')
            .delete()
            .eq('user_id', userId)
            .eq('contact_id', contactId)

        if (error) {
            return { error: error.message }
        }

        return { error: null }
    } catch (error) {
        console.error('Erro ao remover contato:', error)
        return { error: 'Erro ao remover contato' }
    }
}
