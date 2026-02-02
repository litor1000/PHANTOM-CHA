-- ==========================================================
-- ATUALIZAÇÃO DO SISTEMA DE TAXAS (20%)
-- Execute este script no SQL Editor do Supabase
-- ==========================================================

-- 1. ADICIONAR COLUNA DE TAXA NA TABELA DE TRANSAÇÕES (Para auditoria)
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS fee_amount INTEGER DEFAULT 0;

-- 2. ATUALIZAR A FUNÇÃO DE COMPRA COM LÓGICA DE TAXA DE 20%
CREATE OR REPLACE FUNCTION purchase_content(
    p_receiver_id UUID,
    p_amount INTEGER,
    p_description TEXT,
    p_content_id UUID DEFAULT NULL
) 
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
    v_sender_id UUID;
    v_sender_balance INTEGER;
    v_fee_percent NUMERIC := 20; -- TAXA DE 20%
    v_fee_amount INTEGER;
    v_seller_receive INTEGER;
BEGIN
    -- Pegar ID do usuário atual (comprador)
    v_sender_id := auth.uid();
    
    IF v_sender_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
    END IF;

    -- Verificar se está tentando enviar para si mesmo
    IF v_sender_id = p_receiver_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Não pode comprar de si mesmo');
    END IF;

    -- Cálculo das taxas
    v_fee_amount := floor(p_amount * (v_fee_percent / 100));
    v_seller_receive := p_amount - v_fee_amount;

    -- Verificar saldo do comprador
    SELECT wallet_balance INTO v_sender_balance
    FROM public.users
    WHERE id = v_sender_id
    FOR UPDATE;

    IF v_sender_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Saldo insuficiente');
    END IF;

    -- REALIZAR A TRANSAÇÃO ATÔMICA
    -- 1. Debitar valor INTEGRAL do comprador
    UPDATE public.users 
    SET wallet_balance = wallet_balance - p_amount 
    WHERE id = v_sender_id;

    -- 2. Creditar valor LÍQUIDO no vendedor (com desconto de 20%)
    UPDATE public.users 
    SET wallet_balance = wallet_balance + v_seller_receive 
    WHERE id = p_receiver_id;

    -- 3. Registrar a transação com os detalhes da taxa
    INSERT INTO public.transactions (
        sender_id, 
        receiver_id, 
        amount, 
        fee_amount, -- Guardamos quanto a plataforma ganhou aqui
        type, 
        description, 
        content_id,
        metadata
    ) VALUES (
        v_sender_id,
        p_receiver_id,
        p_amount, -- O valor nominal da transação continua sendo o total
        v_fee_amount,
        'purchase',
        p_description,
        p_content_id,
        jsonb_build_object(
            'currency', 'PHANTOM_TOKEN',
            'fee_percent', v_fee_percent,
            'seller_received', v_seller_receive
        )
    );

    RETURN jsonb_build_object(
        'success', true, 
        'new_balance', v_sender_balance - p_amount,
        'fee_collected', v_fee_amount,
        'seller_received', v_seller_receive
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
