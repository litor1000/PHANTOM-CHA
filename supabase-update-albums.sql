-- ==========================================================
-- ATUALIZAÇÃO: ÁLBUM DE FOTOS
-- Rode este script no Editor SQL do Supabase para adicionar
-- o suporte a álbuns de fotos.
-- ==========================================================

-- 1. Criar tabela de álbuns
CREATE TABLE IF NOT EXISTS public.user_albums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_user_albums_user ON public.user_albums(user_id);

-- 3. Habilitar segurança (RLS)
ALTER TABLE public.user_albums ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas de segurança para a tabela
-- (Usamos DO block para evitar erro se a policy já existir, embora seja tabela nova)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_albums' AND policyname = 'Anyone can view album photos'
    ) THEN
        CREATE POLICY "Anyone can view album photos" 
          ON public.user_albums FOR SELECT 
          USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_albums' AND policyname = 'Users can add own album photos'
    ) THEN
        CREATE POLICY "Users can add own album photos" 
          ON public.user_albums FOR INSERT 
          WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_albums' AND policyname = 'Users can delete own album photos'
    ) THEN
        CREATE POLICY "Users can delete own album photos" 
          ON public.user_albums FOR DELETE 
          USING (auth.uid() = user_id);
    END IF;
END
$$;

-- 5. Configurar Storage (Bucket de fotos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('album-photos', 'album-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Políticas de Storage
-- (Também protegidas contra duplicação)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Anyone can view album photos storage'
    ) THEN
        CREATE POLICY "Anyone can view album photos storage"
          ON storage.objects FOR SELECT
          USING (bucket_id = 'album-photos');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated users can upload album photos storage'
    ) THEN
        CREATE POLICY "Authenticated users can upload album photos storage"
          ON storage.objects FOR INSERT
          WITH CHECK (bucket_id = 'album-photos' AND auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can delete own album photos storage'
    ) THEN
        CREATE POLICY "Users can delete own album photos storage"
          ON storage.objects FOR DELETE
          USING (bucket_id = 'album-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
    END IF;
END
$$;
