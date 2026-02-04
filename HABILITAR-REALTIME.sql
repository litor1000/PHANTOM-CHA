-- ==========================================================
-- HABILITAR REALTIME PARA MENSAGENS E PAGAMENTOS
-- Execute este script no SQL Editor do seu Dashboard do Supabase
-- ==========================================================

-- 1. Garante que a publicação do Realtime existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END
$$;

-- 2. Adicionar tabelas à publicação (apenas se não estiverem lá)
-- Mensagens (Para chat instantâneo)
-- Pagamentos (Para confirmação de PIX)
-- Usuários (Para saldo e status online)
DO $$
BEGIN
    -- Tentamos adicionar individualmente para evitar erro se já existir
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE messages; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE payments; EXCEPTION WHEN others THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE users; EXCEPTION WHEN others THEN NULL; END;
END
$$;

-- 3. Configurar REPLICA IDENTITY FULL
-- Isso garante que as mudanças em qualquer campo sejam detectadas
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.payments REPLICA IDENTITY FULL;
ALTER TABLE public.users REPLICA IDENTITY FULL;

-- 4. Permissões básicas
GRANT SELECT ON public.messages TO authenticated;
GRANT SELECT ON public.payments TO authenticated;
GRANT SELECT ON public.users TO authenticated;
