import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import MercadoPagoConfig, { Payment } from 'mercadopago'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!
})

export async function POST(req: Request) {
    try {
        const url = new URL(req.url)
        const type = url.searchParams.get('type')
        const dataId = url.searchParams.get('data.id')

        // O Mercado Pago envia o ID do recurso via query params quando é uma notificação v1
        // Se for um POST com body, pegamos do body
        const body = await req.json().catch(() => ({}))
        const resourceId = dataId || body?.data?.id || body?.id

        if (type === 'payment' && resourceId) {
            // 1. Consultar o pagamento no Mercado Pago para confirmar o status
            const payment = new Payment(client)
            const mpPayment = await payment.get({ id: resourceId })

            if (mpPayment.status === 'approved') {
                // 2. Buscar o pagamento correspondente no nosso banco
                const { data: dbPayment, error: findError } = await supabaseAdmin
                    .from('payments')
                    .select('id, status')
                    .eq('external_id', resourceId.toString())
                    .single()

                if (dbPayment && dbPayment.status !== 'approved') {
                    // 3. Chamar a função RPC que criamos (process_payment_success)
                    // Usamos a função RPC para garantir atomicidade (atualiza pagamento + credita banco)
                    const { error: rpcError } = await supabaseAdmin.rpc('process_payment_success', {
                        p_payment_id: dbPayment.id
                    })

                    if (rpcError) throw rpcError
                }
            }
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Erro no Webhook:', error)
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
    }
}
