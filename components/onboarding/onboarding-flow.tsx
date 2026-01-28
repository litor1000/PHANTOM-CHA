'use client'

import { useState } from 'react'
import { WelcomeScreen } from './welcome-screen'
import { AuthForm, type UserFormData } from './auth-form-refactored'

interface OnboardingFlowProps {
  onComplete: (userData: UserFormData) => void
}

type OnboardingStep = 'welcome' | 'auth'

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<OnboardingStep>('welcome')

  return (
    <main className="h-dvh w-full max-w-md mx-auto flex flex-col bg-background overflow-hidden shadow-2xl">
      {step === 'welcome' && (
        <WelcomeScreen onComplete={() => setStep('auth')} />
      )}
      {step === 'auth' && (
        <AuthForm
          onComplete={onComplete}
          onBack={() => setStep('welcome')}
        />
      )}
    </main>
  )
}
