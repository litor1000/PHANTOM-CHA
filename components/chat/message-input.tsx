'use client'

import React from "react"

import { useState, useRef } from 'react'
import { Camera, Send, Smile, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { EmojiPicker } from './emoji-picker'

interface MessageInputProps {
  onSend: (content: string, expiresIn?: number) => void
  onSendPhoto?: (photoData: string, mentions: string[], expiresIn?: number) => void
}

export function MessageInput({ onSend, onSendPhoto }: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  // Fixed expiry time of 5 seconds for security
  const EXPIRES_IN = 5
  
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const adjustHeight = () => {
    const textarea = inputRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    adjustHeight()
  }

  const handleSend = () => {
    if (!message.trim()) return
    onSend(message.trim())
    setMessage('')
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    setMessage((prev) => prev + emoji)
    // Need to wait for render to adjust height
    setTimeout(adjustHeight, 0)
    inputRef.current?.focus()
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onSendPhoto) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const text = message
        const matches = Array.from(text.matchAll(/@([a-zA-Z0-9_]+)/g)).map(m => m[1].toLowerCase())
        const mentions = Array.from(new Set(matches))
        onSendPhoto(reader.result as string, mentions)
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ''
  }

  return (
    <div className="flex items-end gap-2 px-3 py-3 bg-card border-t border-border">
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-9 w-9 text-primary cursor-default hover:bg-transparent"
          aria-label="Tempo de expiração fixo"
          title="Mensagens expiram em 10s"
        >
          <Clock className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">
            5s
          </span>
        </Button>
      </div>

      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="shrink-0 text-muted-foreground hover:text-foreground h-9 w-9"
          aria-label="Adicionar emoji"
        >
          <Smile className="h-5 w-5" />
        </Button>
        <EmojiPicker
          isOpen={showEmojiPicker}
          onClose={() => setShowEmojiPicker(false)}
          onSelect={handleEmojiSelect}
        />
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => photoInputRef.current?.click()}
        className="shrink-0 text-muted-foreground hover:text-foreground h-9 w-9"
        aria-label="Enviar foto"
      >
        <Camera className="h-5 w-5" />
      </Button>
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoSelect}
      />

      <div className="flex-1 relative">
        <textarea
          ref={inputRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Mensagem secreta..."
          rows={1}
          className={cn(
            'w-full resize-none rounded-2xl bg-secondary px-4 py-2.5',
            'text-sm text-foreground placeholder:text-muted-foreground/60',
            'focus:outline-none focus:ring-2 focus:ring-primary/50',
            'max-h-32 overflow-y-auto'
          )}
          style={{
            height: 'auto',
            minHeight: '42px',
          }}
        />
      </div>

      <Button
        size="icon"
        onClick={handleSend}
        disabled={!message.trim()}
        className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-9 w-9 disabled:opacity-50"
        aria-label="Enviar mensagem"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  )
}
