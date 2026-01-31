-- ==========================================================
-- CORREÇÃO: PERMISSÃO DE EDIÇÃO DE ÁLBUM
-- ==========================================================

-- O erro ocorre porque faltava uma política permitindo que o dono do álbum
-- atualize seus próprios registros (para adicionar pessoas permitidas).

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_albums' AND policyname = 'Users can update own album photos'
    ) THEN
        CREATE POLICY "Users can update own album photos"
          ON public.user_albums FOR UPDATE
          USING (auth.uid() = user_id);
    END IF;
END
$$;
