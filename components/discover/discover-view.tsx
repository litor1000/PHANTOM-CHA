'use client'

import { useState, useEffect } from 'react'
import { Search, Star, Users, Sparkles, Flame, UserPlus, ShieldCheck, MessageSquare, Clock, XCircle, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { User, CurrentUser } from '@/lib/types'
import Image from 'next/image'
import { useToast } from "@/components/ui/use-toast"

interface DiscoverUser extends User {
    relationship: 'none' | 'pending' | 'accepted' | 'declined'
}

interface DiscoverViewProps {
    onSelectUser: (userId: string) => void
    currentUser: CurrentUser
}

export function DiscoverView({ onSelectUser, currentUser }: DiscoverViewProps) {
    const { toast } = useToast()
    const [users, setUsers] = useState<DiscoverUser[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'todos' | 'novos' | 'trending'>('todos')

    const loadUsers = async () => {
        setIsLoading(true)
        const { getDiscoverUsers } = await import('@/lib/supabase/discover')
        const { data } = await getDiscoverUsers(currentUser.id, 20)
        if (data) setUsers(data as DiscoverUser[])
        setIsLoading(false)
    }

    useEffect(() => {
        loadUsers()
    }, [currentUser.id])

    const handleUserClick = async (user: DiscoverUser) => {
        if (user.relationship === 'accepted') {
            onSelectUser(user.id)
            return
        }

        if (user.relationship === 'pending') {
            toast({
                title: "Solicitação Pendente",
                description: `Você já enviou uma solicitação para @${user.nickname}. Aguarde a aprovação dele(a).`,
            })
            return
        }

        if (user.relationship === 'declined') {
            toast({
                variant: "destructive",
                title: "Solicitação Recusada",
                description: `@${user.nickname} recusou sua solicitação de conversa.`,
            })
            return
        }

        // Se for 'none', enviar solicitação
        try {
            const { sendChatRequest } = await import('@/lib/supabase/discover')
            const { error } = await sendChatRequest(currentUser.id, user.id)

            if (error) {
                toast({
                    variant: "destructive",
                    title: "Erro ao enviar solicitação",
                    description: "Não foi possível enviar a solicitação agora. Tente novamente mais tarde."
                })
                return
            }

            // Atualizar estado local
            setUsers(prev => prev.map(u =>
                u.id === user.id ? { ...u, relationship: 'pending' } : u
            ))

            toast({
                title: "Solicitação Enviada",
                description: `Sua solicitação para conversar com @${user.nickname} foi enviada com sucesso!`,
            })
        } catch (err) {
            console.error(err)
        }
    }

    const tabs = [
        { id: 'todos', label: 'Todos', icon: Users },
        { id: 'novos', label: 'Novos', icon: Sparkles },
        { id: 'trending', label: 'Trending', icon: Flame },
    ]

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden">
            {/* Header */}
            <header className="px-6 py-4 flex flex-col gap-4">
                <h1 className="text-2xl font-black text-center tracking-tight text-foreground mt-2">Descobrir</h1>

                {/* Tabs - Pill style like screenshot */}
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn(
                                "px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap border flex items-center gap-2",
                                activeTab === tab.id
                                    ? "bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                                    : "bg-secondary/30 border-border/50 text-muted-foreground hover:bg-secondary/50"
                            )}
                        >
                            {activeTab === tab.id && <tab.icon className="w-3 h-3" />}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            {/* Grid Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-24 custom-scrollbar">
                {isLoading ? (
                    <div className="grid grid-cols-2 gap-3">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="aspect-[3/4] rounded-[28px] bg-secondary/50 animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        {users.map((user) => (
                            <UserCard
                                key={user.id}
                                user={user}
                                onClick={() => handleUserClick(user)}
                            />
                        ))}
                    </div>
                )}

                {!isLoading && users.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground opacity-50">
                        <Users className="w-12 h-12 mb-4" />
                        <p className="text-sm font-bold uppercase tracking-widest">Ninguém aqui ainda</p>
                    </div>
                )}
            </div>
        </div>
    )
}

function UserCard({ user, onClick }: { user: DiscoverUser; onClick: () => void }) {
    // Mock follower count based on ID length
    const followers = ((user.id.length * 7) % 50) + 2.5
    const isFeatured = user.id.length % 3 === 0

    const statusConfig = {
        none: { icon: UserPlus, label: 'Seguir', color: 'bg-primary/20 text-primary border-primary/40' },
        pending: { icon: Clock, label: 'Pendente', color: 'bg-amber-500/20 text-amber-500 border-amber-500/40' },
        accepted: { icon: MessageSquare, label: 'Conversar', color: 'bg-green-500/20 text-green-500 border-green-500/40' },
        declined: { icon: XCircle, label: 'Recusado', color: 'bg-red-500/20 text-red-500 border-red-500/40' },
    }

    const config = statusConfig[user.relationship]

    return (
        <button
            onClick={onClick}
            className="group relative aspect-[3/4] w-full rounded-[28px] overflow-hidden border border-white/5 bg-zinc-900 shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] text-left"
        >
            {/* Background Image - Using Cover Photo to fill space better */}
            <div className="absolute inset-0 z-0">
                <Image
                    src={user.coverPhoto || user.avatar || "/placeholder.svg"}
                    alt={user.name}
                    fill
                    className={cn(
                        "object-cover transition-all duration-500 group-hover:scale-110",
                        user.coverPhoto ? "opacity-60 blur-[1px]" : "opacity-40 blur-md grayscale-[0.3]"
                    )}
                />
                {/* Dynamic Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-zinc-950/40 z-10" />
            </div>

            {/* Card Content */}
            <div className="absolute inset-0 z-20 p-4 flex flex-col items-center justify-end text-center">
                {/* Profile Circle */}
                <div className="relative mb-3">
                    <div className="w-16 h-16 rounded-full border-2 border-primary/50 overflow-hidden bg-zinc-800 shadow-lg group-hover:border-primary transition-colors">
                        <Image
                            src={user.avatar || "/placeholder.svg"}
                            alt={user.name}
                            fill
                            className="object-cover"
                        />
                    </div>
                    {user.isOnline && (
                        <div className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-zinc-950 shadow-sm" />
                    )}
                </div>

                {/* User Info */}
                <div className="space-y-0.5 w-full">
                    <h3 className="text-sm font-black text-white truncate px-1">
                        {user.name}
                    </h3>

                    {/* Relationship Badge */}
                    <div className={cn(
                        "flex items-center justify-center gap-1 text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full border mx-auto w-fit mt-1",
                        config.color
                    )}>
                        <config.icon className="w-2.5 h-2.5" />
                        {config.label}
                    </div>
                </div>
            </div>

            {/* Star Icon in Corner */}
            <div className="absolute top-3 right-3 z-30">
                <div className={cn(
                    "p-1.5 rounded-full backdrop-blur-md border",
                    isFeatured ? "bg-primary/20 border-primary/40 text-primary" : "bg-black/20 border-white/5 text-white/40"
                )}>
                    <Star className={cn("w-3 h-3", isFeatured && "fill-current")} />
                </div>
            </div>

            {/* Status Badge Top Left */}
            {isFeatured && (
                <div className="absolute top-3 left-3 z-30">
                    <div className="bg-amber-500/90 text-[8px] font-black px-2 py-0.5 rounded-full text-white uppercase tracking-tighter flex items-center gap-1">
                        <Flame className="w-2.5 h-2.5 fill-current" />
                        Top
                    </div>
                </div>
            )}
        </button>
    )
}
