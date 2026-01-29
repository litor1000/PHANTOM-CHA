import { getSupabaseClient } from './client'
import type { User, CurrentUser } from '../types'

export async function signUp(userData: {
  email: string
  password: string
  name: string
  nickname: string
  phone?: string
}) {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      return { error: 'Configuração do Supabase inválida. Verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no Vercel.' }
    }
    // 1. Verificar se nickname já existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('nickname', userData.nickname.toLowerCase())
      .single()

    if (existingUser) {
      return { error: 'Este nickname já está em uso' }
    }

    // 2. Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        return { error: 'Este email já está cadastrado. Faça login.' }
      }
      if (/invalid api/i.test(authError.message)) {
        return { error: 'Configuração do Supabase inválida. Verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no Vercel.' }
      }
      return { error: authError.message }
    }

    if (!authData.user) {
      return { error: 'Erro ao criar usuário' }
    }

    // 3. Criar perfil na tabela users
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: userData.email,
        name: userData.name,
        nickname: userData.nickname.toLowerCase(),
        phone: userData.phone || '',
        avatar: '',
        profile_photo: '',
        cover_photo: '',
        is_online: true,
      })

    if (profileError) {
      console.error('Erro ao criar perfil:', profileError)
      return { error: 'Erro ao criar perfil do usuário' }
    }

    return { data: authData.user, error: null }
  } catch (error) {
    console.error('Erro no signup:', error)
    return { error: 'Erro ao criar conta' }
  }
}

export async function signIn(email: string, password: string) {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      return { error: 'Configuração do Supabase inválida. Verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no Vercel.' }
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return { error: 'Email ou senha incorretos' }
      }
      if (/invalid api/i.test(error.message)) {
        return { error: 'Configuração do Supabase inválida. Verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no Vercel.' }
      }
      return { error: error.message }
    }

    return { data: data.user, error: null }
  } catch (error) {
    console.error('Erro no login:', error)
    return { error: 'Erro ao fazer login' }
  }
}

export async function signOut() {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return { error: 'Configuração do Supabase inválida. Verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no Vercel.' }
  }
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function signInWithGoogle() {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      return { error: 'Configuração do Supabase inválida. Verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no Vercel.' }
    }
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) {
      if (/invalid api/i.test(error.message)) {
        return { error: 'Configuração do Supabase inválida. Verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no Vercel.' }
      }
      return { error: error.message }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Erro no login com Google:', error)
    return { error: 'Erro ao fazer login com Google' }
  }
}


export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      return null
    }
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) return null

    return {
      id: profile.id,
      name: profile.name,
      nickname: profile.nickname,
      email: profile.email,
      phone: profile.phone,
      avatar: profile.avatar || '',
      profilePhoto: profile.profile_photo || null,
      coverPhoto: profile.cover_photo,
      isOnline: profile.is_online,
    }
  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    return null
  }
}

export async function updateUserProfile(userId: string, updates: Partial<CurrentUser>) {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      return { error: 'Configuração do Supabase inválida. Verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no Vercel.' }
    }
    const updateData: any = {}

    if (updates.name) updateData.name = updates.name
    if (updates.nickname) updateData.nickname = updates.nickname
    if (updates.phone !== undefined) updateData.phone = updates.phone
    if (updates.avatar !== undefined) updateData.avatar = updates.avatar
    if (updates.profilePhoto !== undefined) updateData.profile_photo = updates.profilePhoto
    if (updates.coverPhoto !== undefined) updateData.cover_photo = updates.coverPhoto
    if (updates.isOnline !== undefined) updateData.is_online = updates.isOnline

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)

    if (error) {
      console.error('Erro ao atualizar perfil:', error)
      return { error: error.message }
    }

    return { error: null }
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error)
    return { error: 'Erro ao atualizar perfil' }
  }
}

export async function searchUserByNickname(nickname: string): Promise<User | null> {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      return null
    }
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('nickname', nickname.toLowerCase())
      .single()

    if (error || !data) return null

    return {
      id: data.id,
      name: data.name,
      nickname: data.nickname,
      email: data.email,
      phone: data.phone,
      avatar: data.avatar,
      coverPhoto: data.cover_photo,
      isOnline: data.is_online,
      lastSeen: data.last_seen ? new Date(data.last_seen) : undefined,
    }
  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    return null
  }
}
