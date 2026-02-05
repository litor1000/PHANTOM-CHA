'use client'

import { ExternalLink, Globe, Youtube, Play, Instagram, Twitter } from 'lucide-react'
import { motion } from 'framer-motion'

interface LinkPreviewProps {
    url: string
}

export function LinkPreview({ url }: LinkPreviewProps) {
    let domain = ''
    let type: 'generic' | 'youtube' | 'instagram' | 'twitter' = 'generic'

    try {
        const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
        domain = urlObj.hostname.replace('www.', '')

        if (domain.includes('youtube.com') || domain.includes('youtu.be')) type = 'youtube'
        else if (domain.includes('instagram.com')) type = 'instagram'
        else if (domain.includes('twitter.com') || domain.includes('x.com')) type = 'twitter'
    } catch (e) {
        return null
    }

    const getIcon = () => {
        switch (type) {
            case 'youtube': return <Youtube className="w-5 h-5 text-red-500" />
            case 'instagram': return <Instagram className="w-5 h-5 text-pink-500" />
            case 'twitter': return <Twitter className="w-5 h-5 text-sky-400" />
            default: return <Globe className="w-5 h-5 text-primary" />
        }
    }

    const handleOpen = (e: React.MouseEvent) => {
        e.stopPropagation()
        window.open(url.startsWith('http') ? url : `https://${url}`, '_blank', 'noopener,noreferrer')
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleOpen}
            className="mt-2 p-3 rounded-xl bg-black/20 border border-white/10 flex items-center gap-3 overflow-hidden cursor-pointer hover:bg-black/30 transition-colors group"
        >
            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors relative">
                {getIcon()}
                {type === 'youtube' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="w-3 h-3 text-white fill-current opacity-50" />
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <p className="text-[10px] uppercase font-black tracking-widest text-primary/80 truncate">
                        {domain}
                    </p>
                    <div className="w-1 h-1 rounded-full bg-white/20" />
                    <span className="text-[8px] text-muted-foreground uppercase font-bold">Link Preview</span>
                </div>
                <p className="text-xs text-muted-foreground/80 truncate group-hover:text-foreground transition-colors">
                    {url}
                </p>
            </div>

            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
        </motion.div>
    )
}
