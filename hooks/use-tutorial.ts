import { useEffect, useCallback } from 'react'
import { TUTORIAL_BOT_ID, TUTORIAL_MESSAGES } from '@/lib/bot-data'
import type { Message } from '@/lib/types'

export type TutorialStage =
    | 'greeting'
    | 'instructions'
    | 'test-message'
    | 'congratulations'
    | 'completed'

const TUTORIAL_STORAGE_KEY = 'phantom-tutorial-stage'

export function useTutorial(userId: string | null) {
    const getTutorialStage = useCallback((): TutorialStage => {
        if (!userId) return 'greeting'
        const saved = localStorage.getItem(`${TUTORIAL_STORAGE_KEY}-${userId}`)
        return (saved as TutorialStage) || 'greeting'
    }, [userId])

    const setTutorialStage = useCallback((stage: TutorialStage) => {
        if (!userId) return
        localStorage.setItem(`${TUTORIAL_STORAGE_KEY}-${userId}`, stage)
    }, [userId])

    const getTutorialMessages = useCallback((): Message[] => {
        const stage = getTutorialStage()
        const messages: Message[] = []

        // Always add greeting
        messages.push({ ...TUTORIAL_MESSAGES.greeting, timestamp: new Date(Date.now() - 60000) })

        if (stage === 'greeting') {
            return messages
        }

        // Add instructions and test message
        messages.push({ ...TUTORIAL_MESSAGES.instructions, timestamp: new Date(Date.now() - 50000) })
        messages.push({ ...TUTORIAL_MESSAGES.testMessage, timestamp: new Date(Date.now() - 40000) })

        if (stage === 'instructions' || stage === 'test-message') {
            return messages
        }

        // Add congratulations
        messages.push({ ...TUTORIAL_MESSAGES.congratulations, timestamp: new Date(Date.now() - 10000) })

        return messages
    }, [getTutorialStage])

    const handleMessageRevealed = useCallback((messageId: string) => {
        const stage = getTutorialStage()

        // When user reveals the test message, we don't advance yet
        // We wait for it to expire first
    }, [getTutorialStage])

    const handleMessageExpired = useCallback((messageId: string) => {
        const stage = getTutorialStage()

        // When the test message expires, show congratulations and auto-complete after 5s
        if (messageId === TUTORIAL_MESSAGES.testMessage.id && stage === 'test-message') {
            setTimeout(() => {
                setTutorialStage('congratulations')
                window.dispatchEvent(new CustomEvent('tutorial-stage-changed'))

                // After 5 seconds of showing congratulations, complete tutorial
                setTimeout(() => {
                    setTutorialStage('completed')
                    window.dispatchEvent(new CustomEvent('tutorial-completed'))
                }, 5000) // Wait 5 seconds before bot disappears
            }, 500)
        }
    }, [getTutorialStage, setTutorialStage])

    const handleConversationOpened = useCallback(() => {
        const stage = getTutorialStage()

        // When user opens the bot conversation for the first time, show instructions and test message
        if (stage === 'greeting') {
            setTimeout(() => {
                setTutorialStage('test-message')
                window.dispatchEvent(new CustomEvent('tutorial-stage-changed'))
            }, 500)
        }
    }, [getTutorialStage, setTutorialStage])

    const isTutorialCompleted = useCallback(() => {
        return getTutorialStage() === 'completed'
    }, [getTutorialStage])

    const resetTutorial = useCallback(() => {
        if (!userId) return
        localStorage.removeItem(`${TUTORIAL_STORAGE_KEY}-${userId}`)
        localStorage.removeItem(`phantom-messages-${TUTORIAL_BOT_ID}`)
    }, [userId])

    return {
        getTutorialStage,
        setTutorialStage,
        getTutorialMessages,
        handleMessageRevealed,
        handleMessageExpired,
        handleConversationOpened,
        isTutorialCompleted,
        resetTutorial,
    }
}
