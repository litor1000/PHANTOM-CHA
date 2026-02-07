-- ==========================================================
-- ADMIN SET BALANCE - AJUSTE DIRETO
-- ==========================================================

CREATE OR REPLACE FUNCTION admin_set_balance(
    p_user_id UUID,
    p_new_balance INTEGER,
    p_description TEXT DEFAULT 'Ajuste fixo via Admin'
) 
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
    v_old_balance INTEGER;
    v_diff INTEGER;
BEGIN
    -- 1. Obter saldo antigo para cálculo da diferença (opcional para o log)
    SELECT wallet_balance INTO v_old_balance FROM public.users WHERE id = p_user_id;
    v_diff := p_new_balance - v_old_balance;

    -- 2. Atualizar saldo
    UPDATE public.users 
    SET wallet_balance = p_new_balance 
    WHERE id = p_user_id;

    -- 3. Registrar a transação do ajuste (usando a diferença para o histórico ficar correto)
    INSERT INTO public.transactions (
        sender_id, 
        receiver_id, 
        amount, 
        type, 
        description
    ) VALUES (
        NULL, 
        p_user_id,
        v_diff, 
        'deposit',
        p_description
    );

    RETURN jsonb_build_object('success', true, 'message', 'Saldo atualizado para ' || p_new_balance);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_set_balance TO authenticated;
