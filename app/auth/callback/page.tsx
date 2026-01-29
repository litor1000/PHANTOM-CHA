'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function AuthCallback() {
    const router = useRouter()

    useEffect(() => {
        const handleCallback = async () => {
            try {
                const supabase = getSupabaseClient()
                if (!supabase) {
                    toast.error('Configuração do Supabase inválida. Verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no Vercel.')
                    router.push('/')
                    return
                }
                const { data: { session }, error } = await supabase.auth.getSession()

                if (error) {
                    console.error('Erro no callback:', error)
                    if (typeof error.message === 'string' && /invalid api/i.test(error.message)) {
                        toast.error('Configuração do Supabase inválida. Verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no Vercel.')
                    } else {
                        toast.error('Erro ao fazer login com Google')
                    }
                    router.push('/')
                    return
                }

                if (session?.user) {
                    // Verificar se usuário já tem perfil
                    const { data: existingProfile } = await supabase
                        .from('users')
                        .select('*')
                        .eq('id', session.user.id)
                        .single()

                    if (!existingProfile) {
                        // Criar perfil para novo usuário do Google
                        const email = session.user.email || ''
                        const name = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuário'
                        const nickname = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')

                        const { error: insertError } = await supabase
                            .from('users')
                            .insert({
                                id: session.user.id,
                                email: email,
                                name: name,
                                nickname: nickname,
                                phone: '',
                                avatar: session.user.user_metadata?.avatar_url || '',
                                profile_photo: session.user.user_metadata?.avatar_url || '',
                                cover_photo: '',
                                is_online: true,
                            })

                        if (insertError) {
                            console.error('Erro ao criar perfil:', insertError)
                            toast.error('Erro ao criar perfil')
                        }
                    }

                    toast.success('Login realizado com sucesso!')
                    router.push('/')
                }
            } catch (error) {
                console.error('Erro no callback:', error)
                toast.error('Erro ao processar login')
                router.push('/')
            }
        }

        handleCallback()
    }, [router])

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Processando login...</p>
            </div>
        </div>
    )
}
