-- ==========================================================
-- PHANTOM CHAT - SISTEMA DE PAGAMENTOS (PIX)
-- ==========================================================

-- 1. TABELA DE PAGAMENTOS
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    tokens INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    external_id TEXT, -- ID do Mercado Pago
    payment_method TEXT DEFAULT 'pix',
    qr_code TEXT,      -- Chave Copia e Cola
    qr_code_url TEXT,  -- Imagem do QR Code (Base64 ou URL)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para pagamentos
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments" ON public.payments
    FOR SELECT USING (auth.uid() = user_id);

-- 2. FUNÇÃO PARA APROVAR PAGAMENTO E CREDITAR TOKENS
-- ==========================================================
CREATE OR REPLACE FUNCTION process_payment_success(p_payment_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_payment RECORD;
BEGIN
    -- Busca o pagamento e trava a linha
    SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;

    IF v_payment IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pagamento não encontrado');
    END IF;

    IF v_payment.status = 'approved' THEN
        RETURN jsonb_build_object('success', true, 'message', 'Pagamento já processado');
    END IF;

    -- 1. Atualiza status do pagamento
    UPDATE public.payments 
    SET status = 'approved', updated_at = NOW() 
    WHERE id = p_payment_id;

    -- 2. Credita tokens na carteira do usuário
    UPDATE public.users 
    SET wallet_balance = COALESCE(wallet_balance, 0) + v_payment.tokens 
    WHERE id = v_payment.user_id;

    -- 3. Registra a transação no extrato
    INSERT INTO public.transactions (sender_id, receiver_id, amount, type, description)
    VALUES (NULL, v_payment.user_id, v_payment.tokens, 'deposit', 'Compra de Tokens via Pix');

    RETURN jsonb_build_object('success', true, 'tokens_credited', v_payment.tokens);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION process_payment_success TO authenticated;
