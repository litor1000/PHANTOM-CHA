-- ==========================================================
-- CORREÇÃO: PERMISSÃO DE DELEÇÃO DE MENSAGENS
-- ==========================================================

-- O problema relatado é que as mensagens "reaparecem".
-- Isso ocorre porque o RLS (Row Level Security) está bloqueando o comando DELETE,
-- pois não havia nenhuma política definida para operações DELETE na tabela messages.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can delete their own messages'
    ) THEN
        CREATE POLICY "Users can delete their own messages"
          ON public.messages FOR DELETE
          USING (
            auth.uid() = sender_id OR 
            auth.uid() = receiver_id
          );
    END IF;
END
$$;
