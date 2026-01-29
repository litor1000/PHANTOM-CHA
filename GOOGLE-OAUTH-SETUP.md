# 🔐 Configuração Google OAuth - Phantom Chat

## Passo a Passo para Ativar Login com Google

### 1. Configurar Google Cloud Console

#### Criar Projeto no Google Cloud

1. Acesse: https://console.cloud.google.com/
2. Crie um novo projeto ou selecione um existente
3. Nome do projeto: `Phantom Chat` (ou o nome que preferir)

#### Habilitar Google+ API

1. No menu lateral, vá em **APIs & Services** → **Library**
2. Procure por "Google+ API"
3. Clique em **Enable**

#### Criar Credenciais OAuth 2.0

1. No menu lateral, vá em **APIs & Services** → **Credentials**
2. Clique em **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Se aparecer "Configure consent screen", clique e configure:
   - **User Type**: External
   - **App name**: Phantom Chat
   - **User support email**: seu email
   - **Developer contact**: seu email
   - Clique em **Save and Continue** até o final

4. Volte para **Credentials** e crie o OAuth client ID:
   - **Application type**: Web application
   - **Name**: Phantom Chat Web
   
5. **Authorized JavaScript origins**:
   ```
   http://localhost:3000
   https://seu-dominio.vercel.app
   ```

6. **Authorized redirect URIs**:
   ```
   https://jycmgqrytitiujdfpffk.supabase.co/auth/v1/callback
   http://localhost:3000/auth/callback
   https://seu-dominio.vercel.app/auth/callback
   ```

7. Clique em **CREATE**

8. **Copie e salve**:
   - `Client ID`
   - `Client secret`

---

### 2. Configurar no Supabase

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Authentication** → **Providers**
4. Procure por **Google** e clique para expandir

5. **Preencha**:
   - **Enable Sign in with Google**: ✅ Ativado
   - **Client ID**: Cole o Client ID do Google
   - **Client Secret**: Cole o Client Secret do Google
   
6. **Copie a Redirect URL**:
   ```
   https://jycmgqrytitiujdfpffk.supabase.co/auth/v1/callback
   ```

7. Clique em **Save**

---

### 3. Atualizar Redirect URLs no Google Cloud

Volte para o Google Cloud Console:

1. **APIs & Services** → **Credentials**
2. Clique no OAuth 2.0 Client ID que você criou
3. Em **Authorized redirect URIs**, adicione:
   ```
   https://jycmgqrytitiujdfpffk.supabase.co/auth/v1/callback
   ```

4. Clique em **SAVE**

---

### 4. Testar Localmente

1. **Reinicie o servidor**:
```powershell
# Pare o servidor (Ctrl+C)
npm run dev
```

2. **Acesse**: http://localhost:3000

3. **Teste o login**:
   - Clique em "Continuar com Google"
   - Escolha sua conta Google
   - Aceite as permissões
   - Deve redirecionar para `/auth/callback`
   - Deve criar perfil automaticamente
   - Deve redirecionar para página principal

---

### 5. Configurar para Produção (Vercel)

Quando fizer deploy:

1. **Anote a URL** do deploy: `https://phantom-chat.vercel.app`

2. **Google Cloud Console**:
   - Adicione a URL em **Authorized JavaScript origins**
   - Adicione `https://phantom-chat.vercel.app/auth/callback` em **Authorized redirect URIs**

3. **Teste em produção**

---

## ⚠️ Problemas Comuns

### "redirect_uri_mismatch"
**Causa**: URL de callback não está configurada corretamente

**Solução**:
1. Verifique se a URL está EXATAMENTE igual no Google Cloud e Supabase
2. URLs devem incluir protocolo (https://)
3. Sem barras "/" no final

### "Access blocked: This app's request is invalid"
**Causa**: OAuth consent screen não configurado

**Solução**:
1. Google Cloud → **APIs & Services** → **OAuth consent screen**
2. Configure como **External**
3. Preencha todos os campos obrigatórios

### Usuário logado mas sem perfil
**Causa**: Falha ao criar perfil na tabela `users`

**Solução**:
1. Verifique RLS policies do Supabase
2. Certifique-se que a tabela `users` permite INSERT para authenticated users

---

## 📋 Checklist Final

Antes de considerar completo:

- [ ] Google+ API habilitada
- [ ] OAuth 2.0 Client criado
- [ ] Redirect URIs configuradas (Google + Supabase)
- [ ] Provider Google ativado no Supabase
- [ ] Client ID e Secret salvos no Supabase
- [ ] Testado localmente
- [ ] Testado em produção (após deploy)

---

## 🎉 Está funcionando!

Agora seus usuários podem:
- ✅ Criar conta com Google (1 clique)
- ✅ Login com Google (1 clique)
- ✅ Foto de perfil automática (do Google)
- ✅ Nome automático (do Google)

**Muito mais rápido e seguro!** 🔒
