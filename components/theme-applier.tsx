'use client'

import { useEffect } from 'react'

const themes = {
  teal: {
    primary: 'oklch(0.65 0.2 180)',
    ring: 'oklch(0.65 0.2 180)',
    messageSent: 'oklch(0.35 0.12 180)',
  },
  blue: {
    primary: 'oklch(0.6 0.2 250)',
    ring: 'oklch(0.6 0.2 250)',
    messageSent: 'oklch(0.35 0.12 250)',
  },
  pink: {
    primary: 'oklch(0.65 0.25 350)',
    ring: 'oklch(0.65 0.25 350)',
    messageSent: 'oklch(0.35 0.15 350)',
  },
  orange: {
    primary: 'oklch(0.7 0.2 40)',
    ring: 'oklch(0.7 0.2 40)',
    messageSent: 'oklch(0.4 0.12 40)',
  },
  green: {
    primary: 'oklch(0.65 0.2 140)',
    ring: 'oklch(0.65 0.2 140)',
    messageSent: 'oklch(0.35 0.12 140)',
  },
}

export function ThemeApplier() {
  useEffect(() => {
    const applyTheme = () => {
      const savedTheme = localStorage.getItem('phantom-theme') || 'teal'
      const themeColors = themes[savedTheme as keyof typeof themes]
      
      if (themeColors) {
        const root = document.documentElement
        root.style.setProperty('--primary', themeColors.primary)
        root.style.setProperty('--ring', themeColors.ring)
        root.style.setProperty('--message-sent', themeColors.messageSent)
        root.setAttribute('data-theme', savedTheme)
        console.log('Tema aplicado com sucesso:', savedTheme)
      }
    }

    applyTheme()

    const interval = setInterval(applyTheme, 100)

    window.addEventListener('storage', applyTheme)

    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', applyTheme)
    }
  }, [])

  return null
}
