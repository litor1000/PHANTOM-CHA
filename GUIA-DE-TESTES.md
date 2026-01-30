# 🔧 Guia Rápido de Teste - Phantom Chat

## ✅ Correções Aplicadas

### 1. Busca de Contatos por Nickname
- ✅ Agora busca no Supabase primeiro
- ✅ Encontra usuários reais cadastrados no banco de dados
- ✅ Mantém compatibilidade com dados locais

### 2. Compatibilidade com Android
- ✅ Headers de cache otimizados
- ✅ Configurações de segurança adicionadas
- ✅ Build otimizado para produção

---

## 🧪 Como Testar a Busca de Contatos

### Passo a Passo:

1. **Criar dois usuários no app** (ou usar existentes):
   - Usuário A: `nome: João`, `nickname: joao123`
   - Usuário B: `nome: Maria`, `nickname: maria456`

2. **Fazer login como Usuário A**

3. **Ir para aba "Contatos"** (segunda aba)

4. **No campo "Adicionar @nickname"**, digitar:
   - `maria456` ou `@maria456`

5. **Clicar no botão "+" (Plus)**

6. **Resultado esperado:**
   - ✅ Mensagem: "Contato adicionado - O usuário @maria456 foi adicionado aos seus contatos"
   - ✅ Maria456 aparece na lista de contatos
   - ✅ Pode clicar no ícone de mensagem para iniciar conversa

7. **Se não encontrar:**
   - ❌ Mensagem: "Usuário não encontrado"
   - Verificar se o usuário realmente existe no Supabase
   - Verificar se o nickname está correto (case insensitive)

---

## 📱 Como Testar no Android

### Opção 1: Testar Localmente

```bash
# 1. Fazer build
npm run build

# 2. Rodar localmente
npm start
```

Depois:
- Acessar pelo navegador do Android
- Usar a URL da sua rede local (ex: `http://192.168.1.X:3000`)

### Opção 2: Deploy em Produção (Recomendado)

```bash
# Se estiver usando Vercel
vercel --prod

# Ou fazer push para o repositório Git se tiver deploy automático configurado
git add .
git commit -m "fix: corrigir busca de contatos e compatibilidade Android"
git push origin main
```

Depois do deploy:
1. **Limpar cache do navegador Android:**
   - Chrome Android: Menu → Histórico → Limpar dados de navegação
   - Selecionar "Imagens e arquivos em cache"
   - Limpar

2. **Acessar a URL novamente**

3. **Verificar se não aparece erro de atualização**

---

## 🐛 Troubleshooting

### "Usuário não encontrado" ao buscar contato

**Possíveis causas:**
- Usuário não existe no Supabase
- Nickname digitado incorretamente
- Problema de conexão com Supabase

**Soluções:**
1. Verificar se o SUPABASE_URL e SUPABASE_ANON_KEY estão corretos
2. Abrir o console do navegador (F12) e verificar erros
3. Testar criar um novo usuário primeiro

### Android ainda pede para atualizar

**Possíveis causas:**
- Cache antigo ainda presente
- Service worker antigo registrado
- Versão antiga em cache do navegador

**Soluções:**
1. **Limpar cache completo:**
   - Configurações → Apps → Chrome → Armazenamento → Limpar dados
   
2. **Desregistrar Service Workers:**
   - Acessar `chrome://serviceworker-internals/` no Chrome Android
   - Procurar pelo domínio do app
   - Clicar em "Unregister"

3. **Testar em modo anônimo:**
   - Abrir navegador em modo anônimo
   - Acessar o app
   - Se funcionar, é problema de cache

4. **Aguardar propagação do deploy:**
   - Após deploy, pode levar alguns minutos
   - CDN pode ter cache de 1-5 minutos

---

## 📊 Checklist de Validação

### Funcionalidade de Busca:
- [ ] Consegue adicionar contato pelo nickname exato
- [ ] Busca é case-insensitive (@JOAO123 = @joao123)
- [ ] Funciona com ou sem @ no início
- [ ] Mostra mensagem de sucesso
- [ ] Contato aparece na lista
- [ ] Pode iniciar conversa com contato adicionado

### Compatibilidade Android:
- [ ] App carrega sem erro de atualização
- [ ] Navegação funciona normalmente
- [ ] Imagens carregam corretamente
- [ ] Mensagens enviadas com sucesso
- [ ] Sem erros no console

---

## 📞 Próximos Passos

1. **Fazer deploy da versão corrigida**
2. **Pedir feedback dos usuários Android**
3. **Monitorar erros no console** (se tiver analytics configurado)
4. **Testar em diferentes dispositivos Android** se possível

---

## 💡 Dicas Importantes

- **Sempre limpar cache após deploy** em produção
- **Testar em modo anônimo** para evitar cache local
- **Verificar logs do Supabase** se busca não funcionar
- **Usar DevTools remoto** para debugar Android:
  - Chrome Desktop: `chrome://inspect`
  - Conectar Android via USB
  - Ativar depuração USB no Android

---

## 🔍 Verificação Rápida

Execute no console do navegador para verificar se Supabase está configurado:

```javascript
// Copiar e colar no console (F12)
console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Configurado ✅' : 'Não configurado ❌')
```

Se ambos estiverem configurados, a busca deve funcionar!
