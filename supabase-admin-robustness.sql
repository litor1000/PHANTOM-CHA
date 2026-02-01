-- ==========================================================
-- PHANTOM CHAT - MELHORIAS ROBUSTAS NO ADMIN
-- ==========================================================

-- 1. NOVAS COLUNAS PARA SUPORTE E SEGURANÇA
-- ==========================================================

-- Flag para forçar atualização de Pix
DO $$ BEGIN
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS needs_pix_update BOOLEAN DEFAULT false;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Comentário do Admin nas solicitações de saque
DO $$ BEGIN
    ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS admin_comment TEXT;
EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- 2. FUNÇÕES ATUALIZADAS
-- ==========================================================

-- Admin: Forçar usuário a trocar o Pix
CREATE OR REPLACE FUNCTION admin_request_pix_update(p_user_id UUID, p_status BOOLEAN)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.users SET needs_pix_update = p_status WHERE id = p_user_id;
    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
GRANT EXECUTE ON FUNCTION admin_request_pix_update TO authenticated;


-- Admin: Processar Saque com Motivo (Rejeição explicada)
CREATE OR REPLACE FUNCTION admin_process_withdrawal_v2(
    p_request_id UUID, 
    p_action TEXT, 
    p_comment TEXT DEFAULT NULL
) 
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_req RECORD;
BEGIN
    SELECT * INTO v_req FROM public.withdrawal_requests WHERE id = p_request_id FOR UPDATE;
    
    IF v_req.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Solicitação já processada');
    END IF;

    IF p_action = 'reject' THEN
        -- Devolver dinheiro
        UPDATE public.users SET wallet_balance = wallet_balance + v_req.amount WHERE id = v_req.user_id;
        
        -- Marcar como rejeitado e salvar comentário
        UPDATE public.withdrawal_requests 
        SET status = 'rejected', 
            processed_at = NOW(),
            admin_comment = p_comment
        WHERE id = p_request_id;
        
        -- Opcional: Se for erro de Pix, já marcar o usuário para atualizar
        IF p_comment ILIKE '%pix%' OR p_comment ILIKE '%chave%' THEN
            UPDATE public.users SET needs_pix_update = true WHERE id = v_req.user_id;
        END IF;

        INSERT INTO public.transactions (sender_id, receiver_id, amount, type, description)
        VALUES (NULL, v_req.user_id, v_req.amount, 'refund', 'Saque Rejeitado: ' || COALESCE(p_comment, 'Erro nos dados'));
        
    ELSE
        -- Aprovar
        UPDATE public.withdrawal_requests 
        SET status = 'approved', 
            processed_at = NOW(),
            admin_comment = p_comment 
        WHERE id = p_request_id;
    END IF;
    
    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
GRANT EXECUTE ON FUNCTION admin_process_withdrawal_v2 TO authenticated;

-- Admin: Ver histórico de transações de um usuário específico
CREATE OR REPLACE FUNCTION admin_get_user_stats(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_spent', COALESCE((SELECT SUM(amount) FROM transactions WHERE sender_id = p_user_id), 0),
        'total_received', COALESCE((SELECT SUM(amount) FROM transactions WHERE receiver_id = p_user_id), 0),
        'tx_count', (SELECT COUNT(*) FROM transactions WHERE sender_id = p_user_id OR receiver_id = p_user_id),
        'created_at', (SELECT created_at FROM users WHERE id = p_user_id)
    ) INTO v_stats;
    
    RETURN v_stats;
END;
$$;
GRANT EXECUTE ON FUNCTION admin_get_user_stats TO authenticated;
