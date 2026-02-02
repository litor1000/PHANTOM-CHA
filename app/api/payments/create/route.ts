import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import MercadoPagoConfig, { Payment } from 'mercadopago'

// Configuração do Supabase Admin (necessário para persistir o external_id)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Configuração do Mercado Pago
const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
    options: { timeout: 5000 }
})

export async function POST(req: Request) {
    try {
        const { userId, amount, tokens, email } = await req.json()

        if (!userId || !amount || !tokens) {
            return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
        }

        // 1. Criar o pagamento no Mercado Pago (PIX)
        const payment = new Payment(client)

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
        const isLocalhost = appUrl.includes('localhost')

        // Gerar uma chave de idempotência única para evitar erros de duplicidade
        const idempotencyKey = `${Date.now()}-${userId}-${Math.floor(Math.random() * 1000)}`

        const paymentData: any = {
            body: {
                transaction_amount: amount,
                description: `Phantom Chat - Pacote de ${tokens} Tokens`,
                payment_method_id: 'pix',
                payer: {
                    // PRIORIDADE: E-mail enviado no formulário
                    // SE NÃO TIVER: E-mail de teste (evite usar o e-mail da sua conta vendedora)
                    email: email || (isLocalhost ? 'phantom_test_payer@testuser.com' : 'usuario@phantom.chat'),
                    first_name: 'Comprador',
                    last_name: 'Teste',
                    identification: {
                        type: 'CPF',
                        number: '19106353044' // CPF de teste padrão
                    }
                }
            },
            requestOptions: { idempotencyKey }
        }

        // O Mercado Pago exige uma URL pública para notificações. 
        if (appUrl && !isLocalhost) {
            paymentData.body.notification_url = `${appUrl}/api/payments/webhook`
        }

        const response = await payment.create(paymentData)

        // 2. Registrar na nossa tabela de payments do Supabase
        const { data: dbPayment, error: dbError } = await supabaseAdmin
            .from('payments')
            .insert({
                user_id: userId,
                amount: amount,
                tokens: tokens,
                external_id: response.id?.toString(),
                status: 'pending',
                qr_code: response.point_of_interaction?.transaction_data?.qr_code,
                qr_code_url: response.point_of_interaction?.transaction_data?.qr_code_base64
            })
            .select()
            .single()

        if (dbError) throw dbError

        return NextResponse.json({
            success: true,
            paymentId: dbPayment.id,
            qrCode: response.point_of_interaction?.transaction_data?.qr_code,
            qrCodeBase64: response.point_of_interaction?.transaction_data?.qr_code_base64
        })

    } catch (error: any) {
        console.error('Erro ao criar pagamento:', error)
        return NextResponse.json({
            error: error.message || 'Erro interno ao processar Pix'
        }, { status: 500 })
    }
}
