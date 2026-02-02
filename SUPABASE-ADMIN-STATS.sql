-- ==========================================================
-- ESTATÍSTICAS GERAIS DA PLATAFORMA (ADMIN)
-- ==========================================================

CREATE OR REPLACE FUNCTION admin_get_platform_stats()
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
    v_stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_fee_collected', COALESCE((SELECT SUM(fee_amount) FROM transactions), 0),
        'total_tokens_circulating', COALESCE((SELECT SUM(wallet_balance) FROM users), 0),
        'total_users', (SELECT COUNT(*) FROM users),
        'pending_withdrawals_count', (SELECT COUNT(*) FROM withdrawal_requests WHERE status = 'pending'),
        'pending_withdrawals_amount', COALESCE((SELECT SUM(amount) FROM withdrawal_requests WHERE status = 'pending'), 0)
    ) INTO v_stats;
    
    RETURN v_stats;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_platform_stats TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_platform_stats TO anon; -- Opcional, dependendo da sua auth
