# 🚀 Script de Deploy Rápido - Phantom Chat

## Pré-requisitos
- Vercel CLI instalada
- Git configurado
- Conta na Vercel

## Deploy Rápido

### 1. Instalar Vercel CLI (se necessário)
```powershell
npm install -g vercel
```

### 2. Login na Vercel
```powershell
vercel login
```

### 3. Deploy

#### Primeira vez (Preview):
```powershell
vercel
```

#### Deploy em Produção:
```powershell
vercel --prod
```

---

## Comandos Úteis

### Build local (testar antes de deploy):
```powershell
npm run build
npm start
```

### Ver logs do deploy:
```powershell
vercel logs
```

### Ver lista de deployments:
```powershell
vercel list
```

### Remover deployment:
```powershell
vercel remove [deployment-url]
```

---

## Variáveis de Ambiente

Configure no painel da Vercel ou via CLI:

```powershell
# Adicionar variável de ambiente
vercel env add NEXT_PUBLIC_SUPABASE_URL

# Listar variáveis
vercel env ls
```

---

## Checklist Pré-Deploy

- [ ] Build local funciona (`npm run build`)
- [ ] Todas as features testadas localmente
- [ ] Variáveis de ambiente configuradas
- [ ] .env.local NÃO commitado (já está no .gitignore)
- [ ] Tutorial Bot funciona corretamente
- [ ] Temas aplicam corretamente

---

## Após Deploy

1. ✅ Teste a URL gerada
2. ✅ Verifique se tutorial funciona
3. ✅ Teste cadastro/login (se usando Supabase)
4. ✅ Configure domínio customizado (opcional)
5. ✅ Adicione URL do deploy nas Redirect URLs do Supabase

---

## Problemas Comuns

### "Build failed"
```powershell
# Limpar cache
Remove-Item -Recurse -Force .next
npm run build
```

### "Environment variables not found"
- Configure via: https://vercel.com/dashboard → Seu Projeto → Settings → Environment Variables
- Re-deploy após adicionar variáveis

### Tutorial não funciona em produção
- Verifique se localStorage funciona (bloqueado em alguns navegadores em modo privado)
- Teste em navegador normal (não privado)
