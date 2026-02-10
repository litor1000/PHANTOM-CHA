
-- ========================================
-- PHANTOM CHAT - SISTEMA DE BLOQUEIO
-- ========================================

-- Tabela de usuários bloqueados
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- Indices para busca rápida
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON public.blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON public.blocked_users(blocked_id);

-- RLS
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Users can view their own block list" ON public.blocked_users;
CREATE POLICY "Users can view their own block list" 
  ON public.blocked_users FOR SELECT 
  USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can block others" ON public.blocked_users;
CREATE POLICY "Users can block others" 
  ON public.blocked_users FOR INSERT 
  WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can unblock others" ON public.blocked_users;
CREATE POLICY "Users can unblock others" 
  ON public.blocked_users FOR DELETE 
  USING (auth.uid() = blocker_id);

-- Grants
GRANT ALL ON public.blocked_users TO authenticated;
GRANT ALL ON public.blocked_users TO service_role;

-- NOTIFICAÇÃO: 
-- Você pode usar essa tabela em triggers ou queries para filtrar mensagens.
-- Exemplo de query para carregar conversas filtrando bloqueados:
-- SELECT * FROM messages WHERE sender_id NOT IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = auth.uid());
