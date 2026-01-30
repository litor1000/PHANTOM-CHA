-- ========================================
-- PHANTOM CHAT - SUPABASE SCHEMA
-- ========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- TABELA: users
-- ========================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nickname TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  avatar TEXT,
  profile_photo TEXT,
  cover_photo TEXT,
  is_online BOOLEAN DEFAULT true,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index para busca rápida por nickname
CREATE INDEX IF NOT EXISTS idx_users_nickname ON public.users(nickname);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- ========================================
-- TABELA: messages
-- ========================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  conversation_id UUID,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image')),
  image_url TEXT,
  image_storage_path TEXT,
  allowed_nicknames TEXT[],
  is_read BOOLEAN DEFAULT false,
  is_revealed BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  expires_in INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes para queries rápidas
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

-- ========================================
-- TABELA: conversations
-- ========================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  is_group BOOLEAN DEFAULT false,
  members UUID[] NOT NULL,
  pending_members UUID[],
  admins UUID[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- TABELA: contacts
-- ========================================
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_contacts_user ON public.contacts(user_id);

-- ========================================
-- RLS (Row Level Security) POLICIES
-- ========================================

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Users: qualquer um pode ler, mas só pode atualizar próprio perfil
CREATE POLICY "Users are viewable by everyone" 
  ON public.users FOR SELECT 
  USING (true);

CREATE POLICY "Users can update own profile" 
  ON public.users FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON public.users FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Messages: apenas remetente e destinatário podem ver
CREATE POLICY "Users can view their own messages" 
  ON public.messages FOR SELECT 
  USING (
    auth.uid() = sender_id OR 
    auth.uid() = receiver_id
  );

CREATE POLICY "Users can insert messages" 
  ON public.messages FOR INSERT 
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their received messages" 
  ON public.messages FOR UPDATE 
  USING (auth.uid() = receiver_id);

-- Conversations: apenas membros podem ver
CREATE POLICY "Members can view conversations" 
  ON public.conversations FOR SELECT 
  USING (auth.uid() = ANY(members) OR auth.uid() = ANY(pending_members));

CREATE POLICY "Users can create conversations" 
  ON public.conversations FOR INSERT 
  WITH CHECK (auth.uid() = ANY(members));

-- Contacts: cada usuário vê apenas seus contatos
CREATE POLICY "Users can view own contacts" 
  ON public.contacts FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add contacts" 
  ON public.contacts FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own contacts" 
  ON public.contacts FOR DELETE 
  USING (auth.uid() = user_id);

-- ========================================
-- FUNCTIONS
-- ========================================

-- Function para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para users
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON public.users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para conversations
CREATE TRIGGER update_conversations_updated_at 
  BEFORE UPDATE ON public.conversations 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- STORAGE BUCKETS
-- ========================================
-- IMPORTANTE: Execute estes comandos no painel do Supabase Storage:
-- 
-- 1. Criar bucket "chat-images" (público)
-- 2. Criar bucket "profile-photos" (público)
-- 3. Criar bucket "cover-photos" (público)
--
-- Ou use o código abaixo via SQL (requer privilégios de superusuário):

INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('chat-images', 'chat-images', true),
  ('profile-photos', 'profile-photos', true),
  ('cover-photos', 'cover-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies para chat-images
CREATE POLICY "Anyone can view chat images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-images');

CREATE POLICY "Authenticated users can upload chat images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'chat-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete own chat images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'chat-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies para profile-photos
CREATE POLICY "Anyone can view profile photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-photos');

CREATE POLICY "Authenticated users can upload profile photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'profile-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies para cover-photos
CREATE POLICY "Anyone can view cover photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'cover-photos');

CREATE POLICY "Authenticated users can upload cover photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'cover-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own cover photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'cover-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ========================================
-- TABELA: user_albums
-- ========================================
CREATE TABLE IF NOT EXISTS public.user_albums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_albums_user ON public.user_albums(user_id);

ALTER TABLE public.user_albums ENABLE ROW LEVEL SECURITY;

-- Album photos: anyone can see (but frontend might blur), only owner can add/delete
CREATE POLICY "Anyone can view album photos" 
  ON public.user_albums FOR SELECT 
  USING (true);

CREATE POLICY "Users can add own album photos" 
  ON public.user_albums FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own album photos" 
  ON public.user_albums FOR DELETE 
  USING (auth.uid() = user_id);


-- STORAGE FOR ALBUMS
INSERT INTO storage.buckets (id, name, public)
VALUES ('album-photos', 'album-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies para album-photos
CREATE POLICY "Anyone can view album photos storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'album-photos');

CREATE POLICY "Authenticated users can upload album photos storage"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'album-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete own album photos storage"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'album-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
