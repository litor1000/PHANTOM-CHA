-- ==========================================================
-- HABILITAR REALTIME PARA PAGAMENTOS
-- Execute este script no SQL Editor do seu Dashboard do Supabase
-- ==========================================================

-- 1. Garante que a publicação do Realtime existe e inclui a tabela de pagamentos
-- Isso permite que o frontend "escute" as mudanças no status do pagamento
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END
$$;

ALTER PUBLICATION supabase_realtime ADD TABLE payments;

-- 2. Garante que a tabela tenha o "Replica Identity" configurado para FULL
-- Isso garante que todos os dados (incluindo status) sejam enviados no evento
ALTER TABLE public.payments REPLICA IDENTITY FULL;

-- 3. (Opcional/Segurança) Garante que a função RPC tenha as permissões corretas
GRANT EXECUTE ON FUNCTION process_payment_success TO authenticated;
GRANT EXECUTE ON FUNCTION process_payment_success TO anon;
GRANT SELECT ON public.payments TO authenticated;
GRANT SELECT ON public.payments TO anon;
