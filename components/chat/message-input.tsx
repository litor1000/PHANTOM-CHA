'use client'

import React from "react"

import { useState, useRef } from 'react'
import { Camera, Send, Smile, Clock, Mic, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { EmojiPicker } from './emoji-picker'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Image from "next/image"

interface MessageInputProps {
  onSend: (content: string, expiresIn?: number) => void
  onSendPhoto?: (photoData: string, mentions: string[], expiresIn?: number, price?: number) => void
  onSendAudio?: (audioData: string) => void
  onTyping?: (isTyping: boolean) => void
  disabled?: boolean
}

export function MessageInput({ onSend, onSendPhoto, onSendAudio, onTyping, disabled }: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Media Selection State
  const [selectedMedia, setSelectedMedia] = useState<{ url: string, type: 'image' | 'video' } | null>(null)
  const [price, setPrice] = useState<string>('0')
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false)

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Fixed expiry time
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

    // Manejo de indicativo de digitação
    if (onTyping) {
      onTyping(true)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false)
      }, 2000)
    }
  }

  const handleSend = () => {
    if (!message.trim()) return
    onSend(message.trim())
    setMessage('')
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.focus({ preventScroll: true })
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
    setTimeout(adjustHeight, 0)
    inputRef.current?.focus({ preventScroll: true })
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const type = file.type.startsWith('video/') ? 'video' : 'image'
      const reader = new FileReader()
      reader.onloadend = () => {
        setSelectedMedia({ url: reader.result as string, type })
        setIsPriceModalOpen(true)
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ''
  }

  const handleConfirmMediaSend = () => {
    if (selectedMedia && onSendPhoto) {
      const text = message
      const matches = Array.from(text.matchAll(/@([a-zA-Z0-9_]+)/g)).map(m => m[1].toLowerCase())
      const mentions = Array.from(new Set(matches))

      const priceValue = parseInt(price) || 0

      // If it's a video, we might need a separate callback or adjust onSendPhoto
      // For now, let's assume onSendPhoto handles both or we'll adjust the caller
      onSendPhoto(selectedMedia.url, mentions, undefined, priceValue)

      // Reset
      setSelectedMedia(null)
      setPrice('0')
      setIsPriceModalOpen(false)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64Audio = reader.result as string
          if (onSendAudio) {
            onSendAudio(base64Audio)
          }
        }
        reader.readAsDataURL(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (err) {
      console.error("Error accessing microphone:", err)
      alert("Permissão de microfone negada.")
    }
  }

  const stopRecording = (cancel = false) => {
    if (mediaRecorderRef.current && isRecording) {
      if (cancel) {
        mediaRecorderRef.current.onstop = () => { } // Overwrite stop handler
      }
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <>
      <div className={cn(
        "flex items-end gap-2 px-4 py-4 md:py-5 bg-card border-t border-border",
        disabled && "opacity-50 pointer-events-none grayscale-[0.5]"
      )}>
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-10 w-10 md:h-11 md:w-11 text-primary cursor-default hover:bg-transparent"
            aria-label="Tempo de expiração fixo"
            title="Mensagens expiram em 10s"
          >
            <Clock className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              5s
            </span>
          </Button>
        </div>

        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="shrink-0 text-muted-foreground hover:text-foreground h-10 w-10 md:h-11 md:w-11"
            aria-label="Adicionar emoji"
            disabled={disabled}
          >
            <Smile className="h-6 w-6" />
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
          onClick={() => {
            if (!disabled) photoInputRef.current?.click()
          }}
          className="shrink-0 text-muted-foreground hover:text-foreground h-10 w-10 md:h-11 md:w-11"
          aria-label="Enviar foto"
          disabled={disabled}
        >
          <Camera className="h-6 w-6" />
        </Button>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        {isRecording ? (
          <div className="flex-1 flex items-center gap-3 px-4 py-2 bg-primary/10 rounded-2xl animate-pulse border border-primary/20">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-bold text-primary tabular-nums">{formatTime(recordingTime)}</span>
            <span className="text-xs text-primary/60 italic flex-1">Gravando áudio...</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => stopRecording(true)}
              className="h-8 w-8 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={message}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={disabled ? "Você bloqueou este usuário" : "Mensagem secreta..."}
              enterKeyHint="send"
              rows={1}
              disabled={disabled}
              className={cn(
                'w-full resize-none rounded-2xl bg-secondary px-4 py-3.5',
                'text-base text-foreground placeholder:text-muted-foreground/60',
                'focus:outline-none focus:ring-2 focus:ring-primary/50',
                'max-h-32 overflow-y-auto'
              )}
              style={{
                height: 'auto',
                minHeight: '48px',
              }}
            />
          </div>
        )}

        {message.trim() || isRecording ? (
          <Button
            size="icon"
            onClick={isRecording ? () => stopRecording() : handleSend}
            className={cn(
              "shrink-0 rounded-full h-10 w-10 md:h-11 md:w-11 transition-all duration-300",
              isRecording ? "bg-red-500 hover:bg-red-600 animate-bounce" : "bg-primary hover:bg-primary/90"
            )}
            disabled={disabled}
            aria-label={isRecording ? "Parar gravação" : "Enviar mensagem"}
          >
            {isRecording ? <Mic className="h-5 w-5 text-white" /> : <Send className="h-5 w-5 text-primary-foreground" />}
          </Button>
        ) : (
          <Button
            size="icon"
            onClick={startRecording}
            className="shrink-0 bg-secondary hover:bg-secondary/80 text-muted-foreground rounded-full h-10 w-10 md:h-11 md:w-11"
            aria-label="Gravar áudio"
          >
            <Mic className="h-5 w-5" />
          </Button>
        )}
      </div>

      <Dialog open={isPriceModalOpen} onOpenChange={setIsPriceModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Foto</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-zinc-900 flex items-center justify-center">
              {selectedMedia?.type === 'image' ? (
                <Image
                  src={selectedMedia.url}
                  alt="Preview"
                  fill
                  className="object-contain"
                />
              ) : selectedMedia?.type === 'video' ? (
                <video
                  src={selectedMedia.url}
                  className="max-h-full max-w-full"
                  controls={false}
                  autoPlay
                  muted
                  loop
                />
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Definir Preço (Tokens)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₮</span>
                <Input
                  type="number"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="pl-8"
                  placeholder="0 para Grátis"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Se for 0, a foto será enviada gratuitamente. Se definir um valor, o destinatário precisará pagar para ver.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPriceModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleConfirmMediaSend}>
              Enviar {parseInt(price) > 0 ? `por ${price} ₮` : 'Grátis'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
