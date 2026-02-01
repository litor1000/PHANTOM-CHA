-- ==========================================================
-- ADMIN SETUP - FUNÇÕES E CORREÇÕES
-- ==========================================================

-- 1. CORREÇÃO DE POLÍTICAS (Para evitar erro "already exists")
-- ==========================================================
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;

CREATE POLICY "Users can view own transactions" 
    ON public.transactions FOR SELECT 
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);


-- 2. FUNÇÃO ADMINISTRATIVA: ADICIONAR FUNDOS (DEPÓSITO)
-- ==========================================================
-- Permite que o sistema adicione saldo a um usuário.
-- IMPORTANTE: Em produção, adicione verificação de permissão de admin.
CREATE OR REPLACE FUNCTION admin_add_funds(
    p_user_id UUID,
    p_amount INTEGER,
    p_description TEXT DEFAULT 'Recarga do Sistema'
) 
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER -- Roda como admin
AS $$
BEGIN
    -- 1. Atualizar saldo do usuário
    UPDATE public.users 
    SET wallet_balance = wallet_balance + p_amount 
    WHERE id = p_user_id;

    -- 2. Registrar transação de depósito
    INSERT INTO public.transactions (
        sender_id, -- NULL para sistema
        receiver_id, 
        amount, 
        type, 
        description
    ) VALUES (
        NULL, -- Sistema
        p_user_id,
        p_amount,
        'deposit',
        p_description
    );

    RETURN jsonb_build_object('success', true, 'message', 'Fundos adicionados com sucesso');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_add_funds TO authenticated;
