-- ==========================================================
-- SETUP DA CARTEIRA DIGITAL (PHANTOM ECONOMY)
-- ==========================================================

-- 1. ADICIONAR COLUNA DE SALDO NA TABELA USERS
-- ==========================================================
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS wallet_balance INTEGER DEFAULT 0;

-- 2. CRIAR TABELA DE TRANSAÇÕES
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES public.users(id), -- Quem enviou (NULL se for depósito do sistema)
    receiver_id UUID REFERENCES public.users(id), -- Quem recebeu
    amount INTEGER NOT NULL CHECK (amount > 0), -- Valor da transação
    type TEXT NOT NULL, -- 'transfer', 'deposit', 'purchase'
    description TEXT, -- Descrição (ex: "Compra de foto")
    content_id UUID, -- ID da mensagem ou foto comprada (opcional)
    metadata JSONB, -- Dados extras
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_transactions_sender ON public.transactions(sender_id);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver ON public.transactions(receiver_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);

-- 3. CONFIGURAR SEGURANÇA (RLS)
-- ==========================================================
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas transações onde são remetentes ou destinatários
-- Usuários podem ver apenas transações onde são remetentes ou destinatários
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'transactions' 
        AND policyname = 'Users can view own transactions'
    ) THEN
        CREATE POLICY "Users can view own transactions" 
            ON public.transactions FOR SELECT 
            USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
    END IF;
END
$$;

-- Apenas o sistema (via funções seguras) pode inserir transações
-- Nenhuma política de INSERT/UPDATE/DELETE para usuários comuns

-- 4. FUNÇÃO SEGURA DE TRANSFERÊNCIA/COMPRA
-- ==========================================================
-- Esta função é atômica: ou transfere tudo e grava o histórico, ou falha e não muda nada.
CREATE OR REPLACE FUNCTION purchase_content(
    p_receiver_id UUID,
    p_amount INTEGER,
    p_description TEXT,
    p_content_id UUID DEFAULT NULL
) 
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER -- Roda com permissões de superusuário para alterar saldos de outros
AS $$
DECLARE
    v_sender_id UUID;
    v_sender_balance INTEGER;
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

    -- Verificar saldo do comprador (bloqueando a linha para evitar condição de corrida)
    SELECT wallet_balance INTO v_sender_balance
    FROM public.users
    WHERE id = v_sender_id
    FOR UPDATE;

    IF v_sender_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Saldo insuficiente');
    END IF;

    -- Realizar a transferência
    -- 1. Debitar do comprador
    UPDATE public.users 
    SET wallet_balance = wallet_balance - p_amount 
    WHERE id = v_sender_id;

    -- 2. Creditar no vendedor
    UPDATE public.users 
    SET wallet_balance = wallet_balance + p_amount 
    WHERE id = p_receiver_id;

    -- 3. Registrar a transação
    INSERT INTO public.transactions (
        sender_id, 
        receiver_id, 
        amount, 
        type, 
        description, 
        content_id,
        metadata
    ) VALUES (
        v_sender_id,
        p_receiver_id,
        p_amount,
        'purchase',
        p_description,
        p_content_id,
        jsonb_build_object('currency', 'PHANTOM_TOKEN')
    );

    RETURN jsonb_build_object('success', true, 'new_balance', v_sender_balance - p_amount);

EXCEPTION WHEN OTHERS THEN
    -- Em caso de qualquer erro, faz rollback automático
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 5. PERMISSÕES DE EXECUÇÃO
-- ==========================================================
GRANT EXECUTE ON FUNCTION purchase_content TO authenticated;
