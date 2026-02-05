'use client'

import { useEffect } from 'react'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'

export function NativeInit() {
    // usePushNotifications() // Desativado temporariamente para evitar crash sem google-services.json

    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            // Configurar Barra de Status
            StatusBar.setStyle({ style: Style.Dark })
            StatusBar.setBackgroundColor({ color: '#0d0d14' })

            // Esconder Splash Screen após inicialização
            setTimeout(() => {
                SplashScreen.hide()
            }, 500)
        }

        // Registrar Service Worker para Offline
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').then((reg) => {
                console.log('SW Registered:', reg.scope)
            }).catch((err) => {
                console.warn('SW Registration failed:', err)
            })
        }
    }, [])

    return null
}
