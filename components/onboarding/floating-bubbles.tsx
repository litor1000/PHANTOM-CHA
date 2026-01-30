
'use client'

import { useEffect, useRef, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'

interface BubbleType {
    x: number
    y: number
    vx: number
    vy: number
    radius: number
    image?: string
}

export function FloatingBubbles() {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [images, setImages] = useState<HTMLImageElement[]>([])

    // Load user avatars
    useEffect(() => {
        const loadAvatars = async () => {
            const supabase = getSupabaseClient()
            if (!supabase) return

            const { data } = await supabase
                .from('users')
                .select('avatar, profile_photo')
                .limit(20)

            if (data) {
                // Collect URLs
                const urls = data
                    .map(u => u.profile_photo || u.avatar)
                    .filter(url => url && url.startsWith('http'))

                // Load images
                const loadedImages: HTMLImageElement[] = []
                for (const url of urls) {
                    if (typeof url === 'string') {
                        const img = new Image()
                        img.src = url
                        // Wait for load safely
                        await new Promise((resolve) => {
                            img.onload = resolve
                            img.onerror = resolve
                        })
                        loadedImages.push(img)
                    }
                }

                // If few images, duplicate them or add placeholders?
                // Let's just use what we have, or fallback if none
                setImages(loadedImages)
            }
        }

        loadAvatars()
    }, [])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let animationFrameId: number
        let bubbles: BubbleType[] = []

        const initBubbles = () => {
            const count = 15 // Number of bubbles
            bubbles = []
            for (let i = 0; i < count; i++) {
                const radius = 25 + Math.random() * 20 // 25-45px radius
                bubbles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 1.5, // Slow velocity
                    vy: (Math.random() - 0.5) * 1.5,
                    radius
                })
            }
        }

        const update = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            // Update and Draw
            bubbles.forEach((b, i) => {
                // Update position
                b.x += b.vx
                b.y += b.vy

                // Wall collisions
                if (b.x - b.radius < 0 || b.x + b.radius > canvas.width) b.vx *= -1
                if (b.y - b.radius < 0 || b.y + b.radius > canvas.height) b.vy *= -1

                // Constrain to screen
                b.x = Math.max(b.radius, Math.min(canvas.width - b.radius, b.x))
                b.y = Math.max(b.radius, Math.min(canvas.height - b.radius, b.y))

                // Basic Circle Collision (Circle to Circle)
                for (let j = i + 1; j < bubbles.length; j++) {
                    const other = bubbles[j]
                    const dx = other.x - b.x
                    const dy = other.y - b.y
                    const distance = Math.sqrt(dx * dx + dy * dy)
                    const minDist = b.radius + other.radius

                    if (distance < minDist) {
                        // Formatting collision response (simple elastic-ish)
                        const angle = Math.atan2(dy, dx)
                        const targetX = b.x + Math.cos(angle) * minDist
                        const targetY = b.y + Math.sin(angle) * minDist
                        const ax = (targetX - other.x) * 0.05
                        const ay = (targetY - other.y) * 0.05

                        b.vx -= ax
                        b.vy -= ay
                        other.vx += ax
                        other.vy += ay
                    }
                }

                // Draw
                ctx.beginPath()
                ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2)
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)' // Fallback / Background of bubble
                ctx.fill()

                // Stroke
                ctx.strokeStyle = 'rgba(74, 222, 128, 0.3)' // Primaryish color
                ctx.lineWidth = 1
                ctx.stroke()

                // Image
                ctx.save()
                ctx.beginPath()
                ctx.arc(b.x, b.y, b.radius - 2, 0, Math.PI * 2)
                ctx.closePath()
                ctx.clip()

                if (images.length > 0) {
                    // Pick image based on index
                    const img = images[i % images.length]
                    if (img.complete) {
                        // Draw image centered and covering
                        const size = b.radius * 2
                        ctx.drawImage(img, b.x - b.radius, b.y - b.radius, size, size)
                    }
                } else {
                    // Placeholder gradient/color if no images
                    const grad = ctx.createLinearGradient(b.x - b.radius, b.y - b.radius, b.x + b.radius, b.y + b.radius)
                    grad.addColorStop(0, 'rgba(74, 222, 128, 0.2)')
                    grad.addColorStop(1, 'rgba(74, 222, 128, 0.05)')
                    ctx.fillStyle = grad
                    ctx.fill()
                }
                ctx.restore()

                // Shine effect
                ctx.beginPath()
                ctx.arc(b.x - b.radius * 0.3, b.y - b.radius * 0.3, b.radius * 0.2, 0, Math.PI * 2)
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
                ctx.fill()
            })

            animationFrameId = requestAnimationFrame(update)
        }

        // Resize handler
        const handleResize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
            initBubbles()
        }

        handleResize()
        window.addEventListener('resize', handleResize)
        update()

        return () => {
            window.removeEventListener('resize', handleResize)
            cancelAnimationFrame(animationFrameId)
        }
    }, [images])

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none opacity-60"
            style={{ zIndex: 0 }}
        />
    )
}
