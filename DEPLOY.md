# 🚀 Guia de Deploy - Phantom Chat

## Opções de Deploy

### Opção 1: Vercel (Recomendado) ⭐

A Vercel é a plataforma ideal para Next.js, oferecendo deploy automático e configuração zero.

#### Passos para Deploy na Vercel:

1. **Instalar Vercel CLI** (se ainda não tiver):
```bash
npm install -g vercel
```

2. **Fazer login na Vercel**:
```bash
vercel login
```

3. **Deploy do projeto**:
```bash
# Na pasta do projeto
vercel
```

4. **Seguir as instruções**:
   - Set up and deploy? → **Yes**
   - Which scope? → Escolha sua conta
   - Link to existing project? → **No**
   - What's your project's name? → `phantom-chat` (ou o nome que preferir)
   - In which directory is your code located? → `.` (atual)
   - Want to modify settings? → **No**

5. **Deploy para produção**:
```bash
vercel --prod
```

#### Configurar Variáveis de Ambiente na Vercel:

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **Environment Variables**
4. Adicione as seguintes variáveis:

```
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
```

#### URL do Projeto:
Após o deploy, a Vercel fornecerá URLs como:
- **Preview**: `https://phantom-chat-xxx.vercel.app`
- **Produção**: `https://phantom-chat.vercel.app` (ou domínio customizado)

---

### Opção 2: Deploy Manual

#### Pré-requisitos:
- Node.js 18+ instalado
- npm ou yarn

#### Passos:

1. **Build da aplicação**:
```bash
npm run build
```

2. **Testar localmente**:
```bash
npm start
```

3. **Deploy em servidor (VPS, AWS, etc.)**:
   - Upload dos arquivos para o servidor
   - Instalar dependências: `npm install --production`
   - Build: `npm run build`
   - Iniciar: `npm start`
   - Configurar proxy reverso (nginx/apache)
   - Configurar SSL/HTTPS

---

## Configurações Importantes

### 1. Variáveis de Ambiente

Crie um arquivo `.env.local` com:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Opcional
NEXT_PUBLIC_APP_URL=https://seu-dominio.com
```

### 2. Domínio Customizado (Vercel)

1. Vá em **Settings** → **Domains**
2. Adicione seu domínio
3. Configure DNS conforme instruções

### 3. Supabase Configuration

No painel do Supabase:
1. **Authentication** → **URL Configuration**
   - Adicione a URL do deploy em **Redirect URLs**
   - Adicione em **Site URL**

2. **Database** → **Policies**
   - Verifique se as RLS policies estão corretas

---

## Verificação Pós-Deploy

Após o deploy, verifique:

- [ ] ✅ Site carrega corretamente
- [ ] ✅ Tutorial Bot aparece no primeiro acesso
- [ ] ✅ Tutorial funciona (revelar mensagem, auto-destruir)
- [ ] ✅ Cadastro/Login funciona (se usando Supabase)
- [ ] ✅ Temas funcionam
- [ ] ✅ LocalStorage persiste dados
- [ ] ✅ Responsivo em mobile

---

## Monitoramento

### Vercel Analytics
Já configurado em `app/layout.tsx`:
```tsx
import { Analytics } from "@vercel/analytics/react"

<Analytics />
```

### Logs
Acesse logs na Vercel:
- Dashboard → Seu Projeto → **Deployments** → Selecione deploy → **Function Logs**

---

## Troubleshooting

### Build Fails
```bash
# Limpar cache e rebuild
rm -rf .next
npm run build
```

### Environment Variables não funcionam
- Certifique-se que começam com `NEXT_PUBLIC_` para serem acessíveis no client
- Re-deploy após adicionar variáveis

### 404 em rotas
- Next.js usa roteamento baseado em arquivo
- Verifique se `.next` foi gerado corretamente

---

## Atualizações Futuras

Para atualizar o app em produção:

```bash
# Commit suas mudanças
git add .
git commit -m "Update: descrição da mudança"
git push

# Se usando Vercel com GitHub, deploy é automático
# Se não, rode:
vercel --prod
```

---

## 🎉 Deploy Concluído!

Seu Phantom Chat está no ar! 

Compartilhe a URL com seus usuários e comece a usar mensagens secretas! 👻
