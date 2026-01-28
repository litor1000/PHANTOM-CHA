'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmojiPickerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (emoji: string) => void
}

const emojiCategories = {
  'Mais usados': ['😀', '😂', '❤️', '😍', '🔥', '👍', '😊', '🎉', '😎', '🥰', '😘', '🤔'],
  'Rostos': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑'],
  'Gestos': ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛'],
  'Coracao': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️'],
  'Objetos': ['🎉', '🎊', '🎁', '🎈', '🔥', '✨', '💫', '🌟', '⭐', '💥', '💢', '💦', '💨', '🕳️', '💣', '💬', '👁️‍🗨️', '🗨️', '🗯️', '💭'],
}

export function EmojiPicker({ isOpen, onClose, onSelect }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState<keyof typeof emojiCategories>('Mais usados')

  if (!isOpen) return null

  return (
    <div className="absolute bottom-full left-0 mb-2 w-72 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-medium text-foreground">Emojis</span>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-full hover:bg-secondary flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 px-2 py-2 border-b border-border overflow-x-auto">
        {Object.keys(emojiCategories).map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category as keyof typeof emojiCategories)}
            className={cn(
              'px-2 py-1 text-xs rounded-md whitespace-nowrap transition-colors',
              activeCategory === category
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-secondary'
            )}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Emojis Grid */}
      <div className="p-2 h-48 overflow-y-auto">
        <div className="grid grid-cols-8 gap-1">
          {emojiCategories[activeCategory].map((emoji, index) => (
            <button
              key={`${emoji}-${index}`}
              onClick={() => {
                onSelect(emoji)
                onClose()
              }}
              className="w-8 h-8 flex items-center justify-center text-lg hover:bg-secondary rounded-md transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
