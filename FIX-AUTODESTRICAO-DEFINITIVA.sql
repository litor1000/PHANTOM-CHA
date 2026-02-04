
-- ==========================================================
-- SISTEMA DE AUTODESTRUIÇÃO DEFINITIVA (SERVER-SIDE)
-- ==========================================================

-- 1. Cria a extensão para agendamento se não existir
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- 2. Função para deletar mensagens expiradas
CREATE OR REPLACE FUNCTION public.delete_expired_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.messages
    WHERE expires_at IS NOT NULL 
    AND expires_at <= NOW();
END;
$$;

-- 3. Agendar a limpeza para rodar a cada 30 segundos
-- Nota: pg_cron geralmente requer privilégios de superuser em projetos auto-hospedados,
-- no Supabase Cloud, você pode usar as 'Edge Functions' ou apenas garantir que o 
-- código do frontend envie o DELETE quando notar que expirou.
-- Como alternativa robusta para o Paulo, vamos garantir que o carrgamento (SELECT)
-- seja blindado via RLS.

-- 4. Blindagem via RLS (Row Level Security)
-- Isso garante que mesmo que o dado exista no banco, ele NÃO saia do banco se expirou.
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
CREATE POLICY "Users can view their own messages" 
  ON public.messages FOR SELECT 
  USING (
    (auth.uid() = sender_id OR auth.uid() = receiver_id)
    AND 
    (expires_at IS NULL OR expires_at > NOW())
  );

-- 5. Função RPC para limpeza manual rápida pelo frontend
CREATE OR REPLACE FUNCTION public.cleanup_my_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.messages
    WHERE (sender_id = auth.uid() OR receiver_id = auth.uid())
    AND expires_at IS NOT NULL 
    AND expires_at <= NOW();
END;
$$;
