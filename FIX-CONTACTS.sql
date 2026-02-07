-- Tabela de Contatos (Relacionamento entre usuários)
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  contact_id UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, contact_id)
);

-- Habilitar RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
-- Usuário pode ver seus próprios contatos
CREATE POLICY "Users can view own contacts" 
  ON public.contacts FOR SELECT 
  USING (auth.uid() = user_id);

-- Usuário pode adicionar contatos para si mesmo
CREATE POLICY "Users can add contacts" 
  ON public.contacts FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Usuário pode remover seus próprios contatos
CREATE POLICY "Users can remove contacts" 
  ON public.contacts FOR DELETE 
  USING (auth.uid() = user_id);
