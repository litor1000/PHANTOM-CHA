# Configuração do Supabase - Phantom Chat

## Passo 1: Criar as Tabelas

1. Acesse o painel do Supabase: https://app.supabase.com
2. Vá em **SQL Editor** no menu lateral
3. Cole todo o conteúdo do arquivo `supabase-schema.sql`
4. Clique em **Run** para executar

Isso vai criar:
- ✅ Tabela `users` (usuários)
- ✅ Tabela `messages` (mensagens com backup de imagens)
- ✅ Tabela `conversations` (conversas)
- ✅ Tabela `contacts` (contatos)
- ✅ Políticas de segurança (RLS)
- ✅ Buckets de storage (chat-images, profile-photos, cover-photos)

## Passo 2: Verificar Storage Buckets

1. Vá em **Storage** no menu lateral do Supabase
2. Verifique se foram criados 3 buckets:
   - `chat-images` (público)
   - `profile-photos` (público)
   - `cover-photos` (público)

### Se os buckets NÃO foram criados automaticamente:

1. Clique em **New bucket**
2. Crie cada bucket com estas configurações:
   - **Name**: `chat-images`
   - **Public bucket**: ✅ Ativado
   - Repita para `profile-photos` e `cover-photos`

## Passo 3: Configurar Políticas de Storage (se necessário)

Se as políticas de storage não foram criadas, adicione manualmente:

### Para bucket `chat-images`:
1. Vá em Storage > chat-images > Policies
2. Adicione estas políticas:
   - **SELECT**: `Anyone can view` → `true`
   - **INSERT**: `Authenticated users` → `auth.role() = 'authenticated'`
   - **DELETE**: `Users own images` → `auth.uid()::text = (storage.foldername(name))[1]`

### Repita para `profile-photos` e `cover-photos`

## Passo 4: Testar Conexão

1. Abra o app em http://localhost:3000
2. Crie um usuário
3. Entre em uma conversa
4. Clique nos 3 pontinhos no header
5. Verifique o status: deve mostrar **"Status: Conectado"** ✅

## Funcionalidades Implementadas

### ✅ Storage
- Upload de imagens do chat para `chat-images`
- Upload de foto de perfil para `profile-photos`
- Upload de foto de capa para `cover-photos`
- URLs públicas para acesso às imagens

### 🔄 Em Desenvolvimento
- Sincronização de mensagens com Supabase
- Sincronização de usuários com Supabase
- Realtime para mensagens instantâneas

## Como Funciona Atualmente

**Modo Híbrido:**
- ✅ Imagens → **Supabase Storage** (backup na nuvem)
- ✅ Usuários → **localStorage** (offline-first)
- ✅ Mensagens → **localStorage** (offline-first)
- ✅ Conversas → **localStorage** (offline-first)

## Próximos Passos

Para migrar completamente para Supabase:
1. Implementar funções de CRUD para `users`
2. Implementar funções de CRUD para `messages`
3. Implementar funções de CRUD para `conversations`
4. Adicionar Supabase Realtime para chat em tempo real
5. Migrar dados do localStorage para Supabase

## Arquivos Criados

- `supabase-schema.sql` - Schema completo do banco
- `lib/supabase/storage.ts` - Helpers para upload de imagens
- `lib/supabase/client.ts` - Cliente Supabase (já existia)
- `SUPABASE-SETUP.md` - Este arquivo

## Comandos Úteis

```bash
# Ver logs do Supabase (se usando CLI local)
supabase logs

# Fazer backup das tabelas
supabase db dump -f backup.sql

# Resetar banco (CUIDADO - apaga tudo!)
supabase db reset
```

## Suporte

Se tiver problemas:
1. Verifique o console do navegador (F12)
2. Verifique se as variáveis de ambiente estão corretas em `.env.local`
3. Verifique se o RLS (Row Level Security) está configurado corretamente
