'use client'

import { useState, useEffect } from 'react'
import { X, Download, Share, PlusSquare, Smartphone, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export function InstallPrompt() {
    const [showPrompt, setShowPrompt] = useState(false)
    const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other')
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

    useEffect(() => {
        // 1. Detect platform
        const ua = window.navigator.userAgent.toLowerCase()
        if (/iphone|ipad|ipod/.test(ua)) {
            setPlatform('ios')
        } else if (/android/.test(ua)) {
            setPlatform('android')
        }

        // 2. Check if already installed
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        const hasSeenPrompt = localStorage.getItem('phantom-install-prompt-seen')

        // Only show if not installed and hasn't seen it recently
        if (!isStandalone && !hasSeenPrompt) {
            // Delay to not annoy immediately
            const timer = setTimeout(() => {
                setShowPrompt(true)
            }, 5000)
            return () => clearTimeout(timer)
        }

        // 3. Listen for Android installation prompt
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault()
            setDeferredPrompt(e)
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

        // Listen for manual trigger
        const handleManualOpen = () => setShowPrompt(true)
        window.addEventListener('phantom-open-install-prompt', handleManualOpen)

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
            window.removeEventListener('phantom-open-install-prompt', handleManualOpen)
        }
    }, [])

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt()
            const { outcome } = await deferredPrompt.userChoice
            if (outcome === 'accepted') {
                setDeferredPrompt(null)
                setShowPrompt(false)
            }
        }
    }

    const handleClose = () => {
        setShowPrompt(false)
        // Don't show again for 7 days
        localStorage.setItem('phantom-install-prompt-seen', 'true')
    }

    if (!showPrompt) return null

    return (
        <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-zinc-100 p-0 overflow-hidden">
                <div className="relative p-6">
                    <button
                        onClick={handleClose}
                        className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-200"
                    >
                        <X className="h-4 w-4" />
                    </button>

                    <DialogHeader className="items-center text-center pt-4">
                        <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mb-4 border border-primary/30 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]">
                            <Smartphone className="h-8 w-8 text-primary" />
                        </div>
                        <DialogTitle className="text-2xl font-black bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent">
                            Instalar Phantom
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400 mt-2">
                            Transforme o Phantom em um aplicativo no seu celular para acesso rápido e privacidade total.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-8 space-y-6">
                        {platform === 'ios' ? (
                            <div className="space-y-4">
                                <p className="text-sm font-medium text-zinc-300">Como instalar no iPhone:</p>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50">
                                        <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs shrink-0 mt-0.5">1</div>
                                        <p className="text-sm text-zinc-400 flex items-center gap-1.5 flex-wrap">
                                            Toque no ícone de <Share className="h-4 w-4 text-blue-400" /> <span className="text-zinc-300 font-semibold">Compartilhar</span> na barra inferior do Safari.
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-3 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50">
                                        <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs shrink-0 mt-0.5">2</div>
                                        <p className="text-sm text-zinc-400 flex items-center gap-1.5 flex-wrap">
                                            Role para baixo e selecione <PlusSquare className="h-4 w-4" /> <span className="text-zinc-300 font-semibold text-wrap">Adicionar à Tela de Início</span>.
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-3 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50">
                                        <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs shrink-0 mt-0.5">3</div>
                                        <p className="text-sm text-zinc-400">
                                            Toque em <span className="text-zinc-300 font-semibold">Adicionar</span> no canto superior direito.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm font-medium text-zinc-300">Como instalar no Android:</p>
                                <div className="space-y-3">
                                    {deferredPrompt ? (
                                        <Button
                                            onClick={handleInstallClick}
                                            className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group"
                                        >
                                            <Download className="h-5 w-5 group-hover:bounce" />
                                            Instalar Agora
                                            <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
                                        </Button>
                                    ) : (
                                        <div className="flex items-start gap-3 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50">
                                            <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs shrink-0 mt-0.5">1</div>
                                            <p className="text-sm text-zinc-400 flex items-center gap-1.5 flex-wrap">
                                                Toque nos <span className="font-bold">três pontinhos (⋮)</span> no canto superior direito do navegador.
                                            </p>
                                        </div>
                                    )}

                                    {!deferredPrompt && (
                                        <div className="flex items-start gap-3 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50">
                                            <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs shrink-0 mt-0.5">2</div>
                                            <p className="text-sm text-zinc-400 flex items-center gap-1.5">
                                                Selecione <span className="text-zinc-300 font-semibold">Instalar Aplicativo</span> ou <span className="text-zinc-300 font-semibold">Adicionar à tela inicial</span>.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 pt-4 border-t border-zinc-900 flex justify-center">
                        <Button
                            variant="ghost"
                            className="text-zinc-500 hover:text-zinc-300 text-xs gap-2"
                            onClick={handleClose}
                        >
                            Agora não, obrigado
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
