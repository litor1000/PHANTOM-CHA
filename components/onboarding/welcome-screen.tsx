'use client'

import React from "react"

import { useState, useRef, useEffect } from 'react'
import { ChevronUp, Ghost, Sparkles, Eye, EyeOff, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { FloatingBubbles } from './floating-bubbles'

interface WelcomeScreenProps {
  onComplete: () => void
}

const features = [
  {
    icon: EyeOff,
    title: 'Mensagens Fantasma',
    description: 'Suas mensagens desaparecem após serem lidas',
  },
  {
    icon: Eye,
    title: 'Revelar com Toque',
    description: 'Segure para ver, solte para apagar',
  },
  {
    icon: Shield,
    title: 'Privacidade Total',
    description: 'Sem rastros, sem histórico, sem preocupações',
  },
]

export function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const [dragProgress, setDragProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef(0)

  const THRESHOLD = 150

  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const currentY = e.touches[0].clientY
    const diff = startYRef.current - currentY
    const progress = Math.max(0, Math.min(diff / THRESHOLD, 1))
    setDragProgress(progress)
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    if (dragProgress >= 0.8) {
      setShowAuth(true)
    } else {
      setDragProgress(0)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    startYRef.current = e.clientY
    setIsDragging(true)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const diff = startYRef.current - e.clientY
    const progress = Math.max(0, Math.min(diff / THRESHOLD, 1))
    setDragProgress(progress)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    if (dragProgress >= 0.8) {
      setShowAuth(true)
    } else {
      setDragProgress(0)
    }
  }

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false)
        if (dragProgress >= 0.8) {
          setShowAuth(true)
          onComplete()
        } else {
          setDragProgress(0)
        }
      }
    }

    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [isDragging, dragProgress, onComplete])

  useEffect(() => {
    if (showAuth) {
      onComplete()
    }
  }, [showAuth, onComplete])

  if (showAuth) {
    return null
  }

  return (
    <div
      ref={containerRef}
      className="relative flex-1 flex flex-col bg-background overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{
        transform: `translateY(${-dragProgress * 100}%)`,
        transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/images/onboarding-bg.jpg"
          alt=""
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
      </div>

      {/* Floating Bubbles */}
      <FloatingBubbles />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full px-4 pt-8 pb-6">
        {/* Logo and Title */}
        <div className="flex flex-col items-center text-center mb-4">
          <div className="relative mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center backdrop-blur-sm border border-primary/20">
              <Ghost className="w-8 h-8 text-primary" />
            </div>
            <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-primary animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1 tracking-tight">
            Phantom Chat
          </h1>
          <p className="text-muted-foreground text-sm">
            Mensagens que desaparecem
          </p>
        </div>

        {/* Features */}
        <div className="flex-1 flex flex-col justify-center gap-3 w-full">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="flex items-start gap-3 p-3 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50"
              style={{
                animationDelay: `${index * 150}ms`,
              }}
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm mb-0.5">
                  {feature.title}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Swipe Indicator */}
        <div className="flex flex-col items-center gap-2 pt-4">
          <div
            className={cn(
              'flex flex-col items-center gap-1 transition-all duration-300',
              dragProgress > 0 && 'opacity-50'
            )}
          >
            <div className="flex flex-col items-center animate-bounce">
              <ChevronUp className="w-5 h-5 text-primary" />
              <ChevronUp className="w-5 h-5 text-primary -mt-3" />
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              Arraste para cima para comecar
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="w-24 h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-100"
              style={{ width: `${dragProgress * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Auth Panel (revealed when swiping) */}
      <div
        className="absolute top-full left-0 right-0 h-full bg-background"
        onClick={() => onComplete()}
      />
    </div>
  )
}
