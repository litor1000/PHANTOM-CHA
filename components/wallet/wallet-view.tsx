'use client'

import { useState, useEffect } from 'react'
import { Wallet, ArrowUpRight, ArrowDownLeft, History, Plus, ShoppingBag, Zap, Star, ShieldCheck, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { User } from '@/lib/types'

interface Transaction {
    id: string
    amount: number
    type: 'deposit' | 'purchase' | 'transfer'
    description: string
    created_at: string
    sender_id: string
    receiver_id: string
}

interface TokenPackage {
    id: string
    name: string
    tokens: number
    bonus: number
    price: number
    color: string
    popular?: boolean
    highlight?: boolean
}

interface WalletViewProps {
    isOpen: boolean
    onClose: () => void
    currentUser: User
}

export function WalletView({ isOpen, onClose, currentUser }: WalletViewProps) {
    const [view, setView] = useState<'balance' | 'store' | 'pix'>('balance')
    const [balance, setBalance] = useState<number>(0)
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [pixData, setPixData] = useState<{ qrCode: string, qrCodeBase64: string } | null>(null)
    const [isCreatingPayment, setIsCreatingPayment] = useState(false)

    const packages: TokenPackage[] = [
        { id: 'pkg-1', name: 'Bronze', tokens: 10, bonus: 0, price: 10.00, color: 'from-orange-400 to-orange-700' },
        { id: 'pkg-2', name: 'Prata', tokens: 35, bonus: 5, price: 25.00, color: 'from-slate-300 to-slate-500', popular: true },
        { id: 'pkg-3', name: 'Ouro', tokens: 80, bonus: 30, price: 50.00, color: 'from-yellow-400 to-yellow-600' },
        { id: 'pkg-4', name: 'Platina', tokens: 140, bonus: 40, price: 100.00, color: 'from-blue-400 to-blue-700' },
        { id: 'pkg-5', name: 'Safira', tokens: 380, bonus: 130, price: 250.00, color: 'from-indigo-500 to-indigo-800' },
        { id: 'pkg-6', name: 'Esmeralda', tokens: 800, bonus: 300, price: 500.00, color: 'from-emerald-400 to-emerald-700' },
        { id: 'pkg-7', name: 'Diamante', tokens: 1700, bonus: 700, price: 1000.00, color: 'from-cyan-400 to-blue-600', highlight: true },
    ]

    // Carregar dados da carteira
    useEffect(() => {
        if (isOpen && currentUser.id) {
            loadWalletData()
        }
    }, [isOpen, currentUser.id])

    const loadWalletData = async () => {
        try {
            setIsLoading(true)
            const { getSupabaseClient } = await import('@/lib/supabase/client')
            const supabase = getSupabaseClient()
            if (!supabase) return

            // 1. Buscar saldo atualizado
            const { data: userData } = await supabase
                .from('users')
                .select('wallet_balance')
                .eq('id', currentUser.id)
                .single()

            if (userData) {
                setBalance((userData as any).wallet_balance || 0)
            }

            // 2. Buscar histórico de transações
            const { data: txData } = await supabase
                .from('transactions')
                .select('*')
                .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
                .order('created_at', { ascending: false })
                .limit(20)

            if (txData) {
                setTransactions(txData)
            }

        } catch (error) {
            console.error('Erro ao carregar carteira:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const [currentPaymentId, setCurrentPaymentId] = useState<string | null>(null)
    const [isDev, setIsDev] = useState(false)

    useEffect(() => {
        setIsDev(window.location.hostname === 'localhost')
    }, [])

    const handleBuyPackage = async (pkg: TokenPackage) => {
        try {
            setIsCreatingPayment(true)

            const response = await fetch('/api/payments/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUser.id,
                    amount: pkg.price,
                    tokens: pkg.tokens,
                    email: currentUser.email
                })
            })

            const data = await response.json()

            if (data.success) {
                setPixData({
                    qrCode: data.qrCode,
                    qrCodeBase64: data.qrCodeBase64
                })
                setCurrentPaymentId(data.paymentId)
                setView('pix')
            } else {
                alert('Erro ao gerar Pix: ' + (data.error || 'Erro desconhecido'))
            }
        } catch (error) {
            console.error('Erro na compra:', error)
            alert('Falha na comunicação com o servidor de pagamentos.')
        } finally {
            setIsCreatingPayment(false)
        }
    }

    // Listener em tempo real para o status do pagamento
    useEffect(() => {
        if (view === 'pix' && currentPaymentId) {
            let channel: any = null

            const setupListener = async () => {
                const { getSupabaseClient } = await import('@/lib/supabase/client')
                const supabase = getSupabaseClient()
                if (!supabase) return

                channel = supabase
                    .channel(`payment-${currentPaymentId}`)
                    .on(
                        'postgres_changes',
                        {
                            event: 'UPDATE',
                            schema: 'public',
                            table: 'payments',
                            filter: `id=eq.${currentPaymentId}`
                        },
                        (payload) => {
                            if (payload.new.status === 'approved') {
                                // O pagamento foi aprovado!
                                alert('Pagamento aprovado com sucesso! Seus tokens foram creditados.')
                                setView('balance')
                                loadWalletData()
                            }
                        }
                    )
                    .subscribe()
            }

            setupListener()

            return () => {
                if (channel) {
                    import('@/lib/supabase/client').then(({ getSupabaseClient }) => {
                        const supabase = getSupabaseClient()
                        if (supabase) supabase.removeChannel(channel)
                    })
                }
            }
        }
    }, [view, currentPaymentId])

    const simulateSuccess = async () => {
        if (!currentPaymentId) {
            alert('Aguarde o carregamento do Pix...')
            return
        }

        try {
            const { getSupabaseClient } = await import('@/lib/supabase/client')
            const supabase = getSupabaseClient()
            if (!supabase) return

            console.log('Simulando aprovação para:', currentPaymentId)

            // Chama a RPC diretamente
            const { data, error } = await (supabase.rpc as any)('process_payment_success', {
                p_payment_id: currentPaymentId
            })

            if (error) {
                console.error('Erro RPC:', error)
                alert('Erro ao processar no banco: ' + error.message)
            } else if (data && !data.success) {
                alert('Erro na lógica de pagamento: ' + data.error)
            } else {
                alert('Pagamento simulado com sucesso! Atualizando seu saldo...')

                // Fallback: Se o Realtime demorar, forçamos a atualização aqui
                setView('balance')
                loadWalletData()
            }
        } catch (err: any) {
            console.error('Erro catastrofico:', err)
            alert('Falha na comunicação: ' + err.message)
        }
    }

    const copyPixKey = () => {
        if (pixData?.qrCode) {
            navigator.clipboard.writeText(pixData.qrCode)
            alert('Código Pix copiado!')
        }
    }

    const handleWithdrawFunds = async () => {
        const { authenticate } = await import('@/lib/biometrics')

        // 1. Solicitar Valor
        const amountStr = prompt('Quanto de saldo (₮) deseja sacar?')
        if (!amountStr) return

        const amount = parseFloat(amountStr.replace(',', '.'))
        if (isNaN(amount) || amount <= 0) return alert('Valor inválido')
        if (amount < 100) return alert('O valor mínimo para saque é de ₮ 100 (R$ 100,00)')
        if (amount > balance) return alert('Saldo insuficiente')

        // 2. Autenticação Biométrica obrigatória para saques
        try {
            const isAuthorized = await authenticate('Confirme sua identidade para realizar o saque de tokens.')

            if (!isAuthorized) {
                alert('Falha na autenticação. O saque foi cancelado por segurança.')
                return
            }

            // 3. Processar Saque
            const { getSupabaseClient } = await import('@/lib/supabase/client')
            const supabase = getSupabaseClient()
            if (!supabase) return

            const { data, error } = await (supabase.rpc as any)('request_withdrawal', {
                p_amount: amount
            })

            if (error) {
                alert('Erro ao solicitar saque: ' + error.message)
            } else {
                alert('Solicitação de saque enviada com sucesso! O valor foi retido para processamento.')
                loadWalletData()
            }
        } catch (error) {
            console.error('Erro ao sacar:', error)
            alert('Erro inesperado na autenticação biométrica')
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="w-full max-w-md h-full max-h-[700px] flex flex-col bg-background border-border shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden rounded-[32px]">
                <CardHeader className="border-b border-border/50 pb-4 bg-secondary/10 shrink-0">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            {view !== 'balance' ? (
                                <button onClick={() => setView(view === 'pix' ? 'store' : 'balance')} className="flex items-center gap-2 hover:text-primary transition-colors">
                                    <ChevronLeft className="w-5 h-5" />
                                    {view === 'pix' ? 'Checkout Pix' : 'Loja de Tokens'}
                                </button>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Wallet className="w-6 h-6 text-primary" />
                                    Minha Carteira
                                </div>
                            )}
                        </CardTitle>
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-red-500/10 hover:text-red-500">
                            <Plus className="w-5 h-5 rotate-45" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-hidden flex flex-col p-0 min-h-0">
                    {view === 'balance' ? (
                        <div className="flex-1 flex flex-col p-6 gap-6 overflow-hidden min-h-0">
                            <div className="bg-gradient-to-br from-primary/20 via-primary/5 to-transparent rounded-[24px] p-8 flex flex-col items-center justify-center border border-primary/20 relative overflow-hidden shadow-inner group shrink-0">
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all" />
                                <p className="text-[10px] font-black text-primary/70 uppercase tracking-[0.2em] mb-1 z-10">Saldo Phantom</p>
                                <h2 className="text-5xl font-black text-foreground z-10 flex items-baseline gap-1 tracking-tighter">
                                    <span className="text-3xl text-primary/60">₮</span>
                                    {isLoading ? '...' : balance.toLocaleString()}
                                </h2>
                                <div className="grid grid-cols-2 gap-3 mt-8 w-full z-10">
                                    <Button onClick={() => setView('store')} className="h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-2xl shadow-lg shadow-primary/20 uppercase italic text-xs">
                                        <Plus className="w-4 h-4 mr-2" /> Comprar ₮
                                    </Button>
                                    <Button variant="outline" onClick={handleWithdrawFunds} className="h-12 border-primary/30 bg-background/50 text-foreground font-black rounded-2xl hover:bg-primary/5 uppercase italic text-xs">
                                        <ArrowUpRight className="w-4 h-4 mr-2 text-primary" /> Sacar
                                    </Button>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] pl-1 mb-4 flex items-center gap-2 shrink-0">
                                    <History className="w-3 h-3" /> Extrato Recente
                                </h3>
                                <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                                    <div className="space-y-3 pb-4">
                                        {transactions.length === 0 ? (
                                            <div className="text-center py-20 flex flex-col items-center gap-3 opacity-20 italic">
                                                <ShoppingBag className="w-12 h-12" />
                                                <p className="text-xs font-bold uppercase tracking-widest">Nenhuma movimentação</p>
                                            </div>
                                        ) : (
                                            transactions.map((tx) => {
                                                const isIncoming = tx.receiver_id === currentUser.id
                                                return (
                                                    <div key={tx.id} className="flex items-center justify-between p-4 rounded-2xl bg-secondary/20 border border-border/40 hover:bg-secondary/40 transition-all group">
                                                        <div className="flex items-center gap-4">
                                                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", isIncoming ? "bg-green-500/10 text-green-500" : "bg-primary/10 text-primary")}>
                                                                {isIncoming ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-bold text-sm leading-none mb-1">{tx.type === 'deposit' ? 'Depósito' : tx.type === 'purchase' ? 'Venda' : isIncoming ? 'Recebido' : 'Pagamento'}</p>
                                                                <p className="text-[10px] text-muted-foreground font-medium truncate max-w-[140px]">{tx.description || (isIncoming ? 'Tokens recebidos' : 'Tokens enviados')}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className={cn("font-black text-sm", isIncoming ? "text-green-500" : "text-foreground")}>{isIncoming ? '+' : '-'}{Math.abs(tx.amount)} ₮</p>
                                                            <p className="text-[9px] text-muted-foreground font-black uppercase">{new Date(tx.created_at).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : view === 'store' ? (
                        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                            <div className="p-6 bg-primary/5 border-b border-border/10 shrink-0 relative">
                                {isCreatingPayment && (
                                    <div className="absolute inset-0 z-20 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                                        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                                        <p className="text-[9px] font-black uppercase tracking-widest text-primary">Gerando Pix...</p>
                                    </div>
                                )}
                                <h3 className="text-xl font-black tracking-tighter uppercase italic text-primary">Impulsione sua diversão</h3>
                                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest leading-none mt-1">Selecione um pacote de tokens abaixo</p>
                            </div>
                            <div className="flex-1 overflow-y-auto px-6 custom-scrollbar">
                                <div className="grid grid-cols-1 gap-4 py-6">
                                    {packages.map((pkg) => (
                                        <Card key={pkg.id} className={cn("relative overflow-hidden cursor-pointer border-border/50 hover:border-primary/50 transition-all hover:scale-[1.03] active:scale-[0.98] group rounded-2xl", pkg.popular && "ring-2 ring-primary border-primary/50 shadow-xl shadow-primary/10", pkg.highlight && "ring-2 ring-cyan-400 border-cyan-400/50 shadow-2xl shadow-cyan-400/20")} onClick={() => !isCreatingPayment && handleBuyPackage(pkg)}>
                                            {pkg.popular && <div className="absolute top-0 right-0"><Badge className="rounded-none rounded-bl-lg bg-primary text-primary-foreground font-black text-[9px] px-3 py-1 italic">MAIS VENDIDO</Badge></div>}
                                            {pkg.highlight && <div className="absolute top-0 right-0"><Badge className="rounded-none rounded-bl-lg bg-cyan-400 text-black font-black text-[9px] px-3 py-1 italic">MELHOR CUSTO-BENEFÍCIO</Badge></div>}
                                            <CardContent className="p-5 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={cn("w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg shrink-0 group-hover:rotate-3 transition-transform", pkg.color)}>
                                                        <Zap className={cn("w-7 h-7", (pkg.bonus > 0 || pkg.highlight) && "fill-current animate-pulse")} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black text-2xl tracking-tighter">{pkg.tokens} <span className="text-sm font-bold opacity-60">₮</span></h4>
                                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Plano {pkg.name}</p>
                                                        {pkg.bonus > 0 && <span className="text-[9px] font-black text-green-500 uppercase">Inclui bônus de {pkg.bonus} ₮</span>}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[9px] font-black text-muted-foreground uppercase opacity-50 mb-1">Investimento</p>
                                                    <p className="text-lg font-black text-primary italic">R$ {pkg.price.toFixed(2).replace('.', ',')}</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                    <div className="p-5 rounded-[24px] bg-secondary/20 border border-dashed border-border/60 flex items-center gap-4 mt-2">
                                        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0"><ShieldCheck className="w-6 h-6 text-green-500" /></div>
                                        <p className="text-[10px] font-medium text-muted-foreground leading-snug">A transação é criptografada e segura. Seus tokens serão creditados instantaneamente após o pagamento.</p>
                                    </div>
                                    <div className="h-4" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col p-6 items-center justify-center gap-6 overflow-hidden">
                            <div className="text-center space-y-2">
                                <Badge className="bg-green-500/10 text-green-500 border-green-500/20 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Aguardando Pagamento</Badge>
                                <h3 className="text-2xl font-black italic tracking-tighter">Escaneie o QR Code</h3>
                                <p className="text-xs text-muted-foreground">Pague com Pix para receber seus tokens na hora.</p>
                            </div>
                            <div className="relative group">
                                <div className="absolute -inset-4 bg-primary/20 rounded-[40px] blur-2xl group-hover:bg-primary/30 transition-all" />
                                <div className="relative w-56 h-56 bg-white p-4 rounded-[32px] shadow-2xl border border-primary/10">
                                    {pixData?.qrCodeBase64 ? (
                                        <img src={`data:image/png;base64,${pixData.qrCodeBase64}`} alt="QR Code Pix" className="w-full h-full object-contain" />
                                    ) : (
                                        <div className="w-full h-full bg-secondary animate-pulse rounded-2xl" />
                                    )}
                                </div>
                            </div>
                            <div className="w-full space-y-3">
                                <Button onClick={copyPixKey} className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-2xl shadow-xl shadow-primary/20 uppercase italic text-sm">Copiar Pix Copia e Cola</Button>

                                {isDev && (
                                    <Button variant="outline" onClick={simulateSuccess} className="w-full border-dashed border-primary/50 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10">
                                        Simular Aprovação (APENAS DEV)
                                    </Button>
                                )}

                                <Button variant="ghost" onClick={() => setView('store')} className="w-full text-xs font-bold text-muted-foreground uppercase tracking-widest">Escolher outro pacote</Button>
                            </div>
                            <div className="p-4 rounded-2xl bg-secondary/20 border border-border/40 flex items-center gap-3">
                                <Zap className="w-5 h-5 text-primary fill-current animate-pulse" />
                                <p className="text-[10px] font-bold text-muted-foreground leading-tight">Após pagar, não precisa atualizar nada. O saldo cairá na sua conta em até 1 minuto.</p>
                            </div>
                        </div>
                    )}
                </CardContent>

                {/* Footer Fixo (apenas na loja ou checkout) */}
                {view !== 'balance' && (
                    <div className="p-4 bg-secondary/20 border-t border-border/30 shrink-0 flex items-center justify-center gap-6">
                        <div className="flex items-center gap-1.5 opacity-40">
                            <Star className="w-3 h-3 fill-current text-primary" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Premium</span>
                        </div>
                        <div className="flex items-center gap-1.5 opacity-40">
                            <Zap className="w-3 h-3 fill-current text-primary" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Fast-Pay</span>
                        </div>
                        <div className="flex items-center gap-1.5 opacity-40">
                            <History className="w-3 h-3" />
                            <span className="text-[9px] font-black uppercase tracking-widest">24/7 Ops</span>
                        </div>
                    </div>
                )}
            </Card>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(var(--primary-rgb), 0.1); border-radius: 20px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(var(--primary-rgb), 0.2); }
            `}</style>
        </div>
    )
}
