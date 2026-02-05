'use client'

import { Fingerprint, Lock } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { authenticate } from '@/lib/biometrics'
import { useState, useEffect } from 'react'

export function BiometricLock({ onAuthenticated }: { onAuthenticated: () => void }) {
    const [error, setError] = useState<string | null>(null)
    const [isAuthenticating, setIsAuthenticating] = useState(false)

    const handleAuth = async () => {
        if (isAuthenticating) return
        setIsAuthenticating(true)
        setError(null)

        try {
            const success = await authenticate('Acesse o Phantom com sua biometria')
            if (success) {
                onAuthenticated()
            } else {
                setError('Falha na autenticação. Tente novamente.')
            }
        } catch (err) {
            setError('Erro ao processar biometria.')
        } finally {
            setIsAuthenticating(false)
        }
    }

    useEffect(() => {
        // Tenta autenticar automaticamente ao montar
        const timeout = setTimeout(() => {
            handleAuth()
        }, 500)
        return () => clearTimeout(timeout)
    }, [])

    return (
        <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6 text-center">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-sm space-y-8"
            >
                <div className="relative mx-auto w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
                    <motion.div
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.3, 0.6, 0.3]
                        }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        className="absolute inset-x-[-10px] inset-y-[-10px] bg-primary/20 rounded-full blur-xl"
                    />
                    <Fingerprint className="w-12 h-12 text-primary" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-black italic uppercase tracking-tighter">Phantom Bloqueado</h1>
                    <p className="text-muted-foreground text-sm max-w-[200px] mx-auto">
                        Use sua biometria para acessar suas conversas secretas.
                    </p>
                </div>

                <div className="h-6">
                    {error && (
                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-destructive text-xs font-medium"
                        >
                            {error}
                        </motion.p>
                    )}
                </div>

                <Button
                    onClick={handleAuth}
                    disabled={isAuthenticating}
                    className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 font-black uppercase italic shadow-lg shadow-primary/20 text-lg"
                >
                    {isAuthenticating ? (
                        <div className="w-6 h-6 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <>
                            <Lock className="w-5 h-5 mr-3" />
                            Desbloquear
                        </>
                    )}
                </Button>
            </motion.div>

            <div className="absolute bottom-8 text-[10px] uppercase font-black tracking-widest opacity-20">
                Phantom Secure Access
            </div>
        </div>
    )
}
