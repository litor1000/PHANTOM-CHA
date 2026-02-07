-- Políticas de Segurança para Mensagens (RLS)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;

-- 1. Leitura: Usuário vê mensagens onde é remetente ou destinatário
CREATE POLICY "Users can view own messages"
ON public.messages FOR SELECT
USING (
  auth.uid() = sender_id OR 
  auth.uid() = receiver_id
);

-- 2. Inserção: Usuário pode inserir se for o remetente
CREATE POLICY "Users can insert messages"
ON public.messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
);

-- 3. Atualização: Usuário pode atualizar (ler/revelar) se for remetente ou destinatário
CREATE POLICY "Users can update own messages"
ON public.messages FOR UPDATE
USING (
  auth.uid() = sender_id OR 
  auth.uid() = receiver_id
);

-- 4. Deleção: Apenas remetente pode apagar (ou ambos, depende da regra de negócio)
CREATE POLICY "Users can delete own messages"
ON public.messages FOR DELETE
USING (
  auth.uid() = sender_id
);

-- Garantir índice para performance
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON public.messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_sender ON public.messages(receiver_id, sender_id);
