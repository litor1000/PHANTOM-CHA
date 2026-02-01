-- ==========================================================
-- PHANTOM CHAT - FUNCIONALIDADES AVANÇADAS ADMIN & FINANCEIRO
-- ==========================================================

-- 1. ATUALIZAÇÃO DE TABELAS (SUPORTE A DECIMAIS E PIX)
-- ==========================================================

-- Adicionar colunas de Pix e Bloqueio em Users
DO $$ BEGIN
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pix_key TEXT;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pix_key_type TEXT;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Mudar Wallet Balance para NUMERIC (Suporte a centavos ex: 1.80)
DO $$ BEGIN
    ALTER TABLE public.users ALTER COLUMN wallet_balance TYPE NUMERIC(10, 2);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Mudar Transactions Amount para NUMERIC
DO $$ BEGIN
    ALTER TABLE public.transactions ALTER COLUMN amount TYPE NUMERIC(10, 2);
EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- 2. TABELA DE SOLICITAÇÕES DE SAQUE
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id),
    amount NUMERIC(10, 2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    pix_key TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- 3. LIMPEZA DE FUNÇÕES ANTIGAS (EVITAR CONFLITOS DE TIPO)
-- ==========================================================
DROP FUNCTION IF EXISTS admin_add_funds(UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS purchase_content(UUID, INTEGER, TEXT, UUID);

-- 4. NOVAS FUNÇÕES FINANCEIRAS (NUMERIC)
-- ==========================================================

-- Funcão: Admin Adicionar Fundos (Agora aceita decimais e negativos)
CREATE OR REPLACE FUNCTION admin_add_funds(
    p_user_id UUID,
    p_amount NUMERIC,
    p_description TEXT DEFAULT 'Recarga do Sistema'
) 
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
BEGIN
    UPDATE public.users 
    SET wallet_balance = COALESCE(wallet_balance, 0) + p_amount 
    WHERE id = p_user_id;

    INSERT INTO public.transactions (sender_id, receiver_id, amount, type, description) 
    VALUES (NULL, p_user_id, p_amount, 'deposit', p_description);

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
GRANT EXECUTE ON FUNCTION admin_add_funds TO authenticated;


-- Funcão: Compra de Conteúdo (Agora aceita decimais)
CREATE OR REPLACE FUNCTION purchase_content(
    p_receiver_id UUID,
    p_amount NUMERIC,
    p_description TEXT,
    p_content_id UUID DEFAULT NULL
) 
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
    v_sender_id UUID;
    v_sender_balance NUMERIC;
BEGIN
    v_sender_id := auth.uid();
    
    SELECT wallet_balance INTO v_sender_balance
    FROM public.users WHERE id = v_sender_id FOR UPDATE;

    IF v_sender_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Saldo insuficiente');
    END IF;

    -- Transferência
    UPDATE public.users SET wallet_balance = wallet_balance - p_amount WHERE id = v_sender_id;
    UPDATE public.users SET wallet_balance = wallet_balance + p_amount WHERE id = p_receiver_id;

    INSERT INTO public.transactions (sender_id, receiver_id, amount, type, description, content_id) 
    VALUES (v_sender_id, p_receiver_id, p_amount, 'purchase', p_description, p_content_id);

    RETURN jsonb_build_object('success', true, 'new_balance', v_sender_balance - p_amount);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
GRANT EXECUTE ON FUNCTION purchase_content TO authenticated;


-- 5. FUNÇÕES DE ADMINISTRAÇÃO E SAQUE
-- ==========================================================

-- Admin: Bloquear/Desbloquear Usuário
CREATE OR REPLACE FUNCTION admin_toggle_block(p_user_id UUID, p_status BOOLEAN)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.users SET is_blocked = p_status WHERE id = p_user_id;
    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
GRANT EXECUTE ON FUNCTION admin_toggle_block TO authenticated;


-- Usuário: Solicitar Saque
CREATE OR REPLACE FUNCTION request_withdrawal(p_amount NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_balance NUMERIC;
    v_pix_key TEXT;
BEGIN
    v_user_id := auth.uid();
    
    SELECT wallet_balance, pix_key INTO v_balance, v_pix_key
    FROM public.users WHERE id = v_user_id FOR UPDATE;

    IF v_pix_key IS NULL OR v_pix_key = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Chave Pix não cadastrada em Configurações');
    END IF;

    IF v_balance < p_amount THEN
         RETURN jsonb_build_object('success', false, 'error', 'Saldo insuficiente para este saque');
    END IF;

    -- Deduz do saldo imediatamente (Hold)
    UPDATE public.users SET wallet_balance = wallet_balance - p_amount WHERE id = v_user_id;

    INSERT INTO public.withdrawal_requests (user_id, amount, pix_key, status)
    VALUES (v_user_id, p_amount, v_pix_key, 'pending');

    -- Registra transação
    INSERT INTO public.transactions (sender_id, receiver_id, amount, type, description)
    VALUES (v_user_id, NULL, p_amount, 'withdrawal_request', 'Solicitação de Saque');

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
GRANT EXECUTE ON FUNCTION request_withdrawal TO authenticated;


-- Admin: Processar Saque (Aprovar/Rejeitar)
CREATE OR REPLACE FUNCTION admin_process_withdrawal(p_request_id UUID, p_action TEXT) 
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_req RECORD;
BEGIN
    SELECT * INTO v_req FROM public.withdrawal_requests WHERE id = p_request_id FOR UPDATE;
    
    IF v_req.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Solicitação já processada');
    END IF;

    IF p_action = 'reject' THEN
        -- Devolver dinheiro ao usuário
        UPDATE public.users SET wallet_balance = wallet_balance + v_req.amount WHERE id = v_req.user_id;
        
        UPDATE public.withdrawal_requests SET status = 'rejected', processed_at = NOW() WHERE id = p_request_id;
        
        -- Transação de estorno
        INSERT INTO public.transactions (sender_id, receiver_id, amount, type, description)
        VALUES (NULL, v_req.user_id, v_req.amount, 'refund', 'Estorno de Saque Rejeitado');
        
    ELSE
        -- Aprovar (dinheiro já saiu do saldo na solicitação)
        UPDATE public.withdrawal_requests SET status = 'approved', processed_at = NOW() WHERE id = p_request_id;
    END IF;
    
    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
GRANT EXECUTE ON FUNCTION admin_process_withdrawal TO authenticated;

-- Admin: Listar Saques com Dados do Usuário
CREATE OR REPLACE FUNCTION admin_get_withdrawals()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    user_name TEXT,
    user_nickname TEXT,
    amount NUMERIC,
    status TEXT,
    pix_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id,
        w.user_id,
        u.name,
        u.nickname,
        w.amount,
        w.status,
        w.pix_key,
        w.created_at
    FROM public.withdrawal_requests w
    JOIN public.users u ON w.user_id = u.id
    ORDER BY w.created_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION admin_get_withdrawals TO authenticated;

-- Políticas Adicionais
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can create own withdrawal requests" ON public.withdrawal_requests;
    DROP POLICY IF EXISTS "Users can view own withdrawal requests" ON public.withdrawal_requests;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "Users can create own withdrawal requests" 
ON public.withdrawal_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own withdrawal requests" 
ON public.withdrawal_requests FOR SELECT USING (auth.uid() = user_id);

GRANT ALL ON public.withdrawal_requests TO authenticated;
GRANT ALL ON public.withdrawal_requests TO service_role;
