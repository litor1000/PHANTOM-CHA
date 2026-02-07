'use client'

import { useState, useEffect } from 'react'
import {
    ArrowLeft, Wallet, Plus, Minus, Search, User as UserIcon,
    ShieldAlert, Ban, CheckCircle2, XCircle, Clock, ExternalLink,
    RefreshCw, BarChart3, Info, TrendingUp, Users as UsersIcon,
    ArrowUpRight, History, Edit3
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import Link from 'next/link'
import type { User, WithdrawalRequest } from '@/lib/types'
import { cn } from '@/lib/utils'

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState<'users' | 'withdrawals'>('users')
    const [users, setUsers] = useState<User[]>([])
    const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [manualAmount, setManualAmount] = useState<string>('')
    const [platformStats, setPlatformStats] = useState({
        total_fee_collected: 0,
        total_tokens_circulating: 0,
        total_users: 0,
        pending_withdrawals_count: 0,
        pending_withdrawals_amount: 0
    })

    // Modal states
    const [rejectModal, setRejectModal] = useState<{ isOpen: boolean, requestId: string, reason: string }>({ isOpen: false, requestId: '', reason: '' })
    const [selectedUserStats, setSelectedUserStats] = useState<{ isOpen: boolean, userId: string, stats: any }>({ isOpen: false, userId: '', stats: null })
    const [userHistory, setUserHistory] = useState<{ isOpen: boolean, userId: string, transactions: any[] }>({ isOpen: false, userId: '', transactions: [] })

    // Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [accessCode, setAccessCode] = useState('')
    const MASTER_PASSWORD = 'Loslitos22'

    useEffect(() => {
        const storedAuth = localStorage.getItem('phantom-admin-auth')
        if (storedAuth === 'true') setIsAuthenticated(true)
    }, [])

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault()
        if (accessCode === MASTER_PASSWORD) {
            setIsAuthenticated(true)
            localStorage.setItem('phantom-admin-auth', 'true')
        } else {
            alert('Código de acesso inválido!')
        }
    }

    const handleLogoutAdmin = () => {
        setIsAuthenticated(false)
        localStorage.removeItem('phantom-admin-auth')
    }

    useEffect(() => {
        if (isAuthenticated) loadData()
    }, [activeTab, isAuthenticated])

    const loadData = async () => {
        try {
            setIsLoading(true)
            const { getSupabaseClient } = await import('@/lib/supabase/client')
            const supabase = getSupabaseClient()
            if (!supabase) return

            // 1. Carregar estatísticas globais
            const { data: statsData } = await (supabase.rpc as any)('admin_get_platform_stats')
            if (statsData) setPlatformStats(statsData)

            // 2. Carregar dados da aba ativa
            if (activeTab === 'users') {
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .order('created_at', { ascending: false })
                if (data) setUsers(data)
            } else {
                const { data, error } = await (supabase.rpc as any)('admin_get_withdrawals')
                if (data) setWithdrawals(data)
            }
        } catch (error) {
            console.error('Erro:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleAddFunds = async (userId: string, amount: number | string) => {
        if (!amount) return
        const numAmount = typeof amount === 'string' ? parseFloat(amount.replace(',', '.')) : amount
        if (isNaN(numAmount)) return alert('Valor inválido')

        if (!confirm(`Confirmar ajuste de ${numAmount} Tokens?`)) return

        try {
            const { getSupabaseClient } = await import('@/lib/supabase/client')
            const supabase = getSupabaseClient()
            if (supabase) {
                await (supabase.rpc as any)('admin_add_funds', {
                    p_user_id: userId,
                    p_amount: numAmount,
                    p_description: 'Ajuste via Painel Admin'
                })
                setManualAmount('')
                loadData()
            }
        } catch (e) {
            alert('Erro inesperado')
        }
    }

    const handleSetBalance = async (userId: string) => {
        const newBalance = prompt('Digite o NOVO saldo total para este usuário:')
        if (newBalance === null) return
        const amount = parseFloat(newBalance.replace(',', '.'))
        if (isNaN(amount)) return alert('Valor inválido')

        if (!confirm(`Deseja DEFINIR o saldo para ₮ ${amount}?`)) return

        try {
            const { getSupabaseClient } = await import('@/lib/supabase/client')
            const supabase = getSupabaseClient()
            if (supabase) {
                await (supabase.rpc as any)('admin_set_balance', {
                    p_user_id: userId,
                    p_new_balance: amount
                })
                loadData()
            }
        } catch (e) {
            alert('Erro ao definir saldo')
        }
    }

    const handleToggleBlock = async (userId: string, currentStatus: boolean) => {
        const action = currentStatus ? 'desbloquear' : 'bloquear'
        if (!confirm(`Deseja realmente ${action} este usuário?`)) return
        try {
            const { getSupabaseClient } = await import('@/lib/supabase/client')
            const supabase = getSupabaseClient()
            if (supabase) {
                await (supabase.rpc as any)('admin_toggle_block', { p_user_id: userId, p_status: !currentStatus })
                loadData()
            }
        } catch { alert('Erro ao alterar status') }
    }

    const handleRequestPixUpdate = async (userId: string, currentStatus: boolean) => {
        try {
            const { getSupabaseClient } = await import('@/lib/supabase/client')
            const supabase = getSupabaseClient()
            if (supabase) {
                await (supabase.rpc as any)('admin_request_pix_update', { p_user_id: userId, p_status: !currentStatus })
                loadData()
            }
        } catch { alert('Erro ao solicitar atualização de Pix') }
    }

    const handleRejectSubmit = async () => {
        if (!rejectModal.reason) return alert('Diga o motivo da rejeição')
        try {
            setProcessingId(rejectModal.requestId)
            const { getSupabaseClient } = await import('@/lib/supabase/client')
            const supabase = getSupabaseClient()
            if (supabase) {
                await (supabase.rpc as any)('admin_process_withdrawal_v2', {
                    p_request_id: rejectModal.requestId,
                    p_action: 'reject',
                    p_comment: rejectModal.reason
                })
                setRejectModal({ isOpen: false, requestId: '', reason: '' })
                loadData()
            }
        } catch { alert('Erro operacional') } finally { setProcessingId(null) }
    }

    const handleApprove = async (id: string) => {
        if (!confirm('Confirmar que o pagamento Pix foi realizado com sucesso?')) return
        try {
            setProcessingId(id)
            const { getSupabaseClient } = await import('@/lib/supabase/client')
            const supabase = getSupabaseClient()
            if (supabase) {
                await (supabase.rpc as any)('admin_process_withdrawal_v2', {
                    p_request_id: id,
                    p_action: 'approve'
                })
                loadData()
            }
        } catch { alert('Erro ao aprovar') } finally { setProcessingId(null) }
    }

    const viewStats = async (userId: string) => {
        try {
            const { getSupabaseClient } = await import('@/lib/supabase/client')
            const supabase = getSupabaseClient()
            if (supabase) {
                const { data } = await (supabase.rpc as any)('admin_get_user_stats', { p_user_id: userId })
                setSelectedUserStats({ isOpen: true, userId, stats: data })
            }
        } catch { alert('Erro ao carregar estatísticas') }
    }

    const loadHistory = async (userId: string) => {
        try {
            const { getSupabaseClient } = await import('@/lib/supabase/client')
            const supabase = getSupabaseClient()
            if (supabase) {
                const { data } = await supabase
                    .from('transactions')
                    .select('*')
                    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
                    .order('created_at', { ascending: false })
                    .limit(20)

                setUserHistory({ isOpen: true, userId, transactions: data || [] })
            }
        } catch { alert('Erro ao carregar histórico') }
    }

    const filteredUsers = users.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.nickname?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Dashboard Stats
    const totalTokens = users.reduce((acc, user) => acc + (user.wallet_balance || 0), 0)
    const pendingWithdrawalsCount = withdrawals.filter(w => w.status === 'pending').length
    const pendingWithdrawalsAmount = withdrawals.filter(w => w.status === 'pending').reduce((acc, w) => acc + (w.amount || 0), 0)

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <Card className="w-full max-w-sm bg-secondary/10 border-primary/20 backdrop-blur-xl">
                    <CardHeader className="text-center">
                        <ShieldAlert className="w-12 h-12 text-primary mx-auto mb-4" />
                        <CardTitle className="text-2xl font-black">Acesso Restrito</CardTitle>
                        <CardDescription>Digite o código mestre para gerenciar a rede.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <Input
                                type="password"
                                placeholder="Código de Acesso"
                                className="h-12 bg-black/50 border-primary/30 text-center text-xl tracking-[1em]"
                                value={accessCode}
                                onChange={(e) => setAccessCode(e.target.value)}
                                autoFocus
                            />
                            <Button type="submit" className="w-full h-12 font-black uppercase italic">
                                Desbloquear Painel
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header Section */}
                <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/">
                                <Button variant="outline" size="icon" className="rounded-xl h-10 w-10 border-border/40 bg-secondary/20">
                                    <ArrowLeft className="w-5 h-5" />
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-2xl font-black tracking-tighter flex items-center gap-2">
                                    Phantom Admin
                                    <Button variant="ghost" size="icon" onClick={handleLogoutAdmin} className="h-6 w-6 text-muted-foreground hover:text-destructive">
                                        <XCircle className="w-4 h-4" />
                                    </Button>
                                </h1>
                            </div>
                        </div>
                        <Badge variant="outline" className="border-primary/20 text-primary font-bold px-3 py-1 bg-primary/5 uppercase text-[10px] tracking-widest hidden sm:flex">Modo Diretor</Badge>
                    </div>

                    {/* New Mobile-First Tab Switcher */}
                    <div className="grid grid-cols-2 p-1 bg-secondary/30 backdrop-blur-md rounded-2xl border border-white/5">
                        <button
                            onClick={() => {
                                setActiveTab('users')
                                window.scrollTo({ top: 0, behavior: 'smooth' })
                            }}
                            className={cn(
                                "flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest transition-all rounded-xl",
                                activeTab === 'users' ? "bg-primary text-black shadow-[0_0_20px_rgba(168,85,247,0.3)] scale-[0.98]" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <UsersIcon className="w-4 h-4" />
                            Usuários
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('withdrawals')
                                window.scrollTo({ top: 0, behavior: 'smooth' })
                            }}
                            className={cn(
                                "flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest transition-all rounded-xl relative",
                                activeTab === 'withdrawals' ? "bg-primary text-black shadow-[0_0_20px_rgba(168,85,247,0.3)] scale-[0.98]" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Wallet className="w-4 h-4" />
                            Saques
                            {platformStats.pending_withdrawals_count > 0 && (
                                <span className={cn(
                                    "absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black border-2 border-background",
                                    activeTab === 'withdrawals' ? "bg-black text-white" : "bg-red-500 text-white animate-pulse"
                                )}>
                                    {platformStats.pending_withdrawals_count}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Dashboard Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="bg-primary/5 border-primary/20 backdrop-blur-sm overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                            <TrendingUp className="w-16 h-16" />
                        </div>
                        <CardHeader className="pb-2">
                            <CardDescription className="text-primary/70 font-bold uppercase text-[10px] tracking-widest">Tokens em Circulação</CardDescription>
                            <CardTitle className="text-4xl font-black italic tracking-tighter">₮ {platformStats.total_tokens_circulating.toLocaleString()}</CardTitle>
                        </CardHeader>
                        <CardContent><p className="text-[10px] text-muted-foreground uppercase font-bold">Saldo total de tokens</p></CardContent>
                    </Card>

                    <Card className="bg-emerald-500/5 border-emerald-500/20 backdrop-blur-sm relative group overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                            <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                        </div>
                        <CardHeader className="pb-2">
                            <CardDescription className="text-emerald-500/70 font-bold uppercase text-[10px] tracking-widest">Comissão da Plataforma</CardDescription>
                            <CardTitle className="text-4xl font-black text-emerald-500 italic tracking-tighter">₮ {platformStats.total_fee_collected.toLocaleString()}</CardTitle>
                        </CardHeader>
                        <CardContent><p className="text-[10px] text-muted-foreground uppercase font-bold">Lucro retido (20%)</p></CardContent>
                    </Card>

                    <Card className="bg-orange-500/5 border-orange-500/20 backdrop-blur-sm">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-orange-500/70 font-bold uppercase text-[10px] tracking-widest">Saques Pendentes</CardDescription>
                            <CardTitle className="text-4xl font-black italic tracking-tighter">{platformStats.pending_withdrawals_count}</CardTitle>
                        </CardHeader>
                        <CardContent><p className="text-[10px] text-muted-foreground uppercase font-bold italic">Total: ₮ {platformStats.pending_withdrawals_amount.toLocaleString()}</p></CardContent>
                    </Card>

                    <Card className="bg-secondary/40 border-border/40 backdrop-blur-sm">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Total Usuários</CardDescription>
                            <CardTitle className="text-4xl font-black italic tracking-tighter">{platformStats.total_users}</CardTitle>
                        </CardHeader>
                        <CardContent><p className="text-[10px] text-muted-foreground uppercase font-bold italic">{users.filter(u => u.isOnline).length} usuários online</p></CardContent>
                    </Card>
                </div>

                {activeTab === 'users' ? (
                    <>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            </div>
                            <Input
                                placeholder="Filtrar por nome ou @nickname..."
                                className="pl-12 h-14 bg-secondary/20 border-border/40 focus:border-primary/50 text-base rounded-2xl transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {isLoading ? (
                                <div className="col-span-full py-20 flex flex-col items-center gap-4">
                                    <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                                    <p className="font-bold text-muted-foreground">Indexando rede Phantom...</p>
                                </div>
                            ) : filteredUsers.map((user) => (
                                <Card key={user.id} className={cn(
                                    "border-border/40 hover:border-primary/30 transition-all duration-300 relative group overflow-hidden bg-card/40 backdrop-blur-sm",
                                    user.is_blocked && "bg-red-500/5 ring-1 ring-red-500/20"
                                )}>
                                    <CardHeader className="pb-4 flex flex-row items-center gap-4">
                                        <div className="relative">
                                            <Avatar className="h-12 w-12 border-2 border-border/50">
                                                <AvatarImage src={user.avatar} />
                                                <AvatarFallback className="bg-secondary text-lg">
                                                    {user.name?.[0]}
                                                </AvatarFallback>
                                            </Avatar>
                                            {user.isOnline && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-background rounded-full" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <CardTitle className="text-sm font-bold truncate">{user.name}</CardTitle>
                                                {user.is_blocked && <Badge variant="destructive" className="text-[9px] px-1.5 h-4 font-black">BAN</Badge>}
                                            </div>
                                            <p className="text-[11px] text-muted-foreground font-medium">@{user.nickname}</p>
                                        </div>
                                        <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-secondary/50 hover:bg-primary/20 text-primary" onClick={() => viewStats(user.id)} title="Métricas"><BarChart3 className="w-4 h-4" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-secondary/50 hover:bg-primary/20 text-primary" onClick={() => loadHistory(user.id)} title="Histórico"><History className="w-4 h-4" /></Button>
                                            <Button variant="ghost" size="icon" className={cn("h-8 w-8 rounded-lg", user.is_blocked ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")} onClick={() => handleToggleBlock(user.id, !!user.is_blocked)} title={user.is_blocked ? "Desbloquear" : "Bloquear"}><Ban className="w-4 h-4" /></Button>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="space-y-5 px-4 pb-6">
                                        <div className="flex justify-between items-center bg-secondary/20 p-3 rounded-xl border border-border/30">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">Saldo Carteira</span>
                                                <span className="text-xl font-black text-primary tracking-tight">₮ {user.wallet_balance}</span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
                                                onClick={() => handleSetBalance(user.id)}
                                                title="Editar Saldo Total"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase px-1">
                                                <span>Ajuste Rápido</span>
                                                <span className="text-primary italic">Até 2 decimais</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="0,00"
                                                    className="h-10 bg-background/50 border-border/50 text-sm font-bold focus-visible:ring-primary/30"
                                                    onChange={(e) => setManualAmount(e.target.value)}
                                                />
                                                <Button size="icon" className="h-10 w-12 bg-primary hover:bg-primary/80 shrink-0 shadow-lg shadow-primary/20" onClick={() => handleAddFunds(user.id, manualAmount)}>
                                                    <Plus className="w-5 h-5" />
                                                </Button>
                                            </div>
                                        </div>

                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full h-10 text-[11px] font-bold gap-2 rounded-xl transition-all border-dashed",
                                                user.needs_pix_update ? "bg-orange-500/10 border-orange-500 text-orange-600 animate-pulse" : "hover:bg-primary/5 border-border/50"
                                            )}
                                            onClick={() => handleRequestPixUpdate(user.id, !!user.needs_pix_update)}
                                        >
                                            <RefreshCw className={cn("w-3.5 h-3.5", user.needs_pix_update && "animate-spin")} />
                                            {user.needs_pix_update ? "Aguardando Troca de Pix" : "Solicitar Atualização de Pix"}
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="grid gap-6">
                        {withdrawals.length === 0 ? (
                            <div className="py-20 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border/40 rounded-3xl">
                                <Clock className="w-12 h-12 opacity-20 mb-4" />
                                <p className="font-bold">Nenhuma solicitação aguardando pagamento</p>
                            </div>
                        ) : withdrawals.map((req) => (
                            <Card key={req.id} className={cn("border-l-8 group transition-all duration-300 bg-card/40 backdrop-blur-sm", req.status === 'pending' ? "border-l-yellow-500 hover:bg-yellow-500/5" : req.status === 'approved' ? "border-l-green-500" : "border-l-red-500")}>
                                <CardContent className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                    <div className="flex items-center gap-6">
                                        <div className="relative">
                                            <Avatar className="h-14 w-14 border-2 border-border/40 shadow-xl">
                                                <AvatarFallback className="bg-primary text-white font-black text-xl">{req.user_name[0]}</AvatarFallback>
                                            </Avatar>
                                            <div className="absolute -top-1 -left-1 bg-yellow-500 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-black border-2 border-background">!</div>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <p className="font-black text-lg tracking-tight">{req.user_name}</p>
                                                <Badge variant="secondary" className="bg-secondary/60 text-[10px] font-bold">@{req.user_nickname}</Badge>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-2xl font-black text-primary">₮ {req.amount}</span>
                                                <div className="px-3 py-1 bg-background border border-border/50 rounded-lg flex items-center gap-2 group-hover:border-primary/50 transition-colors">
                                                    <span className="text-[9px] font-black text-muted-foreground uppercase opacity-50">Pix:</span>
                                                    <span className="font-mono text-xs font-bold tracking-wider">{req.pix_key}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {req.status === 'pending' ? (
                                            <>
                                                <Button size="lg" className="bg-green-600 hover:bg-green-700 h-14 px-8 rounded-2xl shadow-xl shadow-green-600/20 font-black text-sm uppercase italic" onClick={() => handleApprove(req.id)} disabled={!!processingId}>
                                                    <CheckCircle2 className="w-5 h-5 mr-3" />
                                                    Marcar como Pago
                                                </Button>
                                                <Button size="lg" variant="outline" className="h-14 px-6 rounded-2xl border-red-500/50 text-red-500 hover:bg-red-500/10 font-bold text-xs" onClick={() => setRejectModal({ isOpen: true, requestId: req.id, reason: '' })} disabled={!!processingId}>
                                                    <XCircle className="w-4 h-4 mr-2" />
                                                    Recusar
                                                </Button>
                                            </>
                                        ) : (
                                            <div className="text-right flex items-center gap-6 p-4 bg-secondary/20 rounded-2xl border border-border/30">
                                                <div className="text-left">
                                                    <p className="text-[8px] font-black text-muted-foreground uppercase mb-1">Status do Saque</p>
                                                    <Badge className={cn("px-4 py-1.5 rounded-full font-black text-[10px]", req.status === 'approved' ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'bg-red-500')}>{req.status.toUpperCase()}</Badge>
                                                </div>
                                                {req.admin_comment && (
                                                    <div className="max-w-[200px]">
                                                        <p className="text-[8px] font-black text-muted-foreground uppercase mb-1">Motivo/Nota</p>
                                                        <p className="text-[10px] font-medium leading-tight text-foreground/80 italic">"{req.admin_comment}"</p>
                                                    </div>
                                                )}
                                                <div className="text-right">
                                                    <p className="text-[8px] font-black text-muted-foreground uppercase mb-1">Data</p>
                                                    <p className="text-[10px] font-bold">{new Date(req.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Reject Modal */}
            <Dialog open={rejectModal.isOpen} onOpenChange={(val) => !val && setRejectModal({ ...rejectModal, isOpen: false })}>
                <DialogContent className="rounded-3xl border-border/50 bg-background/95 backdrop-blur-xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black">Rejeitar Solicitação</DialogTitle>
                        <DialogDescription className="font-medium">O usuário terá o saldo estornado e receberá esta justificativa.</DialogDescription>
                    </DialogHeader>
                    <div className="py-6 space-y-4">
                        <label className="text-xs font-bold text-muted-foreground uppercase px-1">Motivo detalhado</label>
                        <Input
                            placeholder="Ex: Dados Pix inválidos ou conta bancária diferente do CPF..."
                            className="h-14 bg-secondary/30 border-border/50 rounded-xl"
                            value={rejectModal.reason}
                            onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                        />
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="ghost" className="rounded-xl h-12" onClick={() => setRejectModal({ isOpen: false, requestId: '', reason: '' })}>Cancelar</Button>
                        <Button variant="destructive" className="rounded-xl h-12 px-8 font-black uppercase text-[10px]" onClick={handleRejectSubmit}>Confirmar Rejeição</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Stats Modal */}
            <Dialog open={selectedUserStats.isOpen} onOpenChange={(val) => !val && setSelectedUserStats({ ...selectedUserStats, isOpen: false })}>
                <DialogContent className="rounded-3xl border-border/50">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black">Performance Financeira</DialogTitle>
                    </DialogHeader>
                    {selectedUserStats.stats && (
                        <div className="grid grid-cols-2 gap-4 py-8">
                            <div className="p-5 bg-red-500/5 border border-red-500/10 rounded-2xl flex flex-col items-center">
                                <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-2">Total Gasto</p>
                                <p className="text-3xl font-black">₮ {selectedUserStats.stats.total_spent}</p>
                            </div>
                            <div className="p-5 bg-green-500/5 border border-green-500/10 rounded-2xl flex flex-col items-center">
                                <p className="text-[9px] font-black text-green-500 uppercase tracking-widest mb-2">Total Recebido</p>
                                <p className="text-3xl font-black">₮ {selectedUserStats.stats.total_received}</p>
                            </div>
                            <div className="p-5 bg-secondary/50 rounded-2xl flex flex-col items-center">
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">Movimentações</p>
                                <p className="text-2xl font-black">{selectedUserStats.stats.tx_count}</p>
                            </div>
                            <div className="p-5 bg-secondary/50 rounded-2xl flex flex-col items-center">
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">Tempo de Casa</p>
                                <p className="text-sm font-black mt-2">{new Date(selectedUserStats.stats.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* History Modal */}
            <Dialog open={userHistory.isOpen} onOpenChange={(val) => !val && setUserHistory({ ...userHistory, isOpen: false })}>
                <DialogContent className="rounded-3xl max-w-2xl border-border/50">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black">Extrato Detalhado</DialogTitle>
                        <DialogDescription>Últimas 20 transações deste usuário na rede.</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-[400px] mt-4 pr-4">
                        <div className="space-y-3">
                            {userHistory.transactions.length === 0 ? (
                                <p className="text-center py-20 text-muted-foreground">Usuário ainda não realizou transações.</p>
                            ) : userHistory.transactions.map((tx) => {
                                const isIncome = tx.receiver_id === userHistory.userId
                                return (
                                    <div key={tx.id} className="flex items-center justify-between p-4 bg-secondary/20 rounded-2xl border border-border/40 hover:bg-secondary/40 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", isIncome ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>
                                                {isIncome ? <BarChart3 className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-tight">{tx.type === 'deposit' ? 'Ajuste Admin' : tx.type === 'purchase' ? 'Venda de Conteúdo' : tx.type}</p>
                                                <p className="text-[10px] text-muted-foreground font-medium">{tx.description || '-'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={cn("font-black", isIncome ? "text-green-500" : "text-foreground")}>{isIncome ? '+' : '-'}{tx.amount} ₮</p>
                                            <p className="text-[9px] text-muted-foreground uppercase font-bold">{new Date(tx.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </div>
    )
}
