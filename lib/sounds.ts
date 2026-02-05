'use client'

export const playSystemSound = (type: 'success' | 'error' | 'click' = 'click') => {
    // Sons baseados em arquivos de áudio leves ou AudioContext
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        if (type === 'success') {
            oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime) // C5
            oscillator.frequency.exponentialRampToValueAtTime(1046.50, audioContext.currentTime + 0.1)
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
            oscillator.start()
            oscillator.stop(audioContext.currentTime + 0.3)
        } else if (type === 'error') {
            oscillator.frequency.setValueAtTime(220, audioContext.currentTime) // A3
            oscillator.frequency.exponentialRampToValueAtTime(110, audioContext.currentTime + 0.2)
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4)
            oscillator.start()
            oscillator.stop(audioContext.currentTime + 0.4)
        } else {
            // Click seco e rápido
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
            gainNode.gain.setValueAtTime(0.05, audioContext.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05)
            oscillator.start()
            oscillator.stop(audioContext.currentTime + 0.05)
        }
    } catch (e) {
        console.warn('AudioContext not supported or blocked', e)
    }
}
