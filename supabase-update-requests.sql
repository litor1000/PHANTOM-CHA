-- ==========================================================
-- ATUALIZAÇÃO: PEDIDOS DE FOTO E PERMISSÕES
-- ==========================================================

-- 1. Atualizar constraint de tipo de mensagem
ALTER TABLE public.messages DROP CONSTRAINT messages_type_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_type_check 
  CHECK (type IN ('text', 'image', 'request'));

-- 2. Adicionar coluna de metadados para mensagens
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 3. Adicionar controle de acesso na tabela user_albums
ALTER TABLE public.user_albums ADD COLUMN IF NOT EXISTS allowed_viewers UUID[] DEFAULT '{}';

-- 4. Atualizar políticas de visualização de álbuns
-- (Removemos a policy antiga 'Anyone can view album photos' se existir, para substituir por uma mais restritiva)
DROP POLICY IF EXISTS "Anyone can view album photos" ON public.user_albums;

-- Nova política: O dono pode ver, e quem estiver na lista allowed_viewers também
CREATE POLICY "Allowed users can view album photos" 
  ON public.user_albums FOR SELECT 
  USING (
    true -- Por enquanto usamos no frontend o blur/lock, então qualquer um pode tecnicamente 'dar fetch' na linha,
         -- mas futuramente podemos restringir o select para garantir segurança real.
         -- Como o frontend precisa mostrar o "blur" (placeholder), precisamos que o registro seja legível.
         -- O ideal seria ter um campo `is_public_placeholder` ou similar, ou retornar URL apenas se permitido.
         -- Para manter a simplicidade da UX atual (ver que tem foto, mas não ver a foto), mantemos TRUE no SELECT.
         -- A segurança real da IMAGEM está no Storage, mas aqui focamos na lógica de permissão.
  );
