# Como Testar o Tutorial Interativo

## Preparação

1. **Limpar dados antigos** (se você já usou o app antes):
   - Abra o DevTools do navegador (F12)
   - Vá em "Application" → "Local Storage"
   - Limpe todos os itens do localStorage do Phantom Chat
   - Ou execute no console:
   ```javascript
   localStorage.clear()
   ```

2. **Iniciar o servidor**:
   ```bash
   npm run dev
   ```

3. **Acessar o app**: Abra http://localhost:3000

## Fluxo de Teste

### 1. Primeiro Acesso (Onboarding)
- [ ] Preencha o formulário de cadastro
- [ ] Complete o onboarding
- [ ] **ESPERADO**: Você deve ver o "Tutorial Bot" (🤖) na lista de conversas

### 2. Abertura do Chat do Bot
- [ ] Clique no Tutorial Bot
- [ ] **ESPERADO**: 
  - Mensagem de boas-vindas já revelada
  - Mensagem de instruções já revelada
  - Mensagem de teste OFUSCADA (borrada)

### 3. Revelando a Mensagem de Teste
- [ ] Toque e SEGURE na mensagem ofuscada por alguns segundos
- [ ] **ESPERADO**:
  - Mensagem é revelada mostrando: "🎯 Esta é uma mensagem secreta de teste!..."
  - Mensagem desaparece após 5 segundos
  - BOT ENVIA AUTOMATICAMENTE:
    - Mensagem de instruções sobre foto
    - Foto de teste OFUSCADA

### 4. Revelando a Foto de Teste
- [ ] Toque e SEGURE na imagem ofuscada
- [ ] **ESPERADO**:
  - Foto é revelada
  - Foto desaparece após 5 segundos
  - BOT ENVIA AUTOMATICAMENTE:
    - Mensagem de parabéns e boas-vindas

### 5. Conclusão do Tutorial
- [ ] Aguarde aproximadamente 8 segundos
- [ ] **ESPERADO**:
  - Tutorial Bot é REMOVIDO automaticamente da lista de conversas
  - Você retorna para a lista de conversas
  - Tutorial Bot não aparece mais

## Verificação no LocalStorage

Durante o teste, você pode monitorar o localStorage:

1. **Depois do onboarding**:
   - `phantom-onboarded` = "1"
   - `phantom-tutorial-stage-current-user` = "greeting"
   - `phantom-messages-bot-tutorial` = array com mensagem greeting

2. **Depois de abrir o chat**:
   - `phantom-tutorial-stage-current-user` = "test-message"
   - `phantom-messages-bot-tutorial` = array com greeting, instructions, testMessage

3. **Depois de revelar a mensagem**:
   - `phantom-tutorial-stage-current-user` = "photo-instructions"
   - `phantom-messages-bot-tutorial` = array com todas as mensagens até photoInstructions

4. **Depois de revelar a foto**:
   - `phantom-tutorial-stage-current-user` = "congratulations"
   - `phantom-messages-bot-tutorial` = array com todas as mensagens incluindo congratulations

5. **Depois de completar**:
   - `phantom-tutorial-stage-current-user` = "completed"
   - `phantom-messages-bot-tutorial` = removido
   - Tutorial Bot removido de `phantom-conversations`

## Problemas Conhecidos a Verificar

- [ ] Mensagens aparecem na ordem correta
- [ ] Transições são suaves e sem erros
- [ ] Tempo de expiração das mensagens é de 5 segundos
- [ ] Bot é removido completamente após conclusão
- [ ] Não há duplicação de mensagens
- [ ] Scroll funciona corretamente quando novas mensagens aparecem

## Resetar para Testar Novamente

Para testar o tutorial novamente:

```javascript
// No console do navegador
localStorage.removeItem('phantom-onboarded')
localStorage.removeItem('phantom-tutorial-stage-current-user')
localStorage.removeItem('phantom-messages-bot-tutorial')
localStorage.removeItem('phantom-conversations')
localStorage.removeItem('phantom-user')
location.reload()
```

Ou simplesmente limpe todo o localStorage:
```javascript
localStorage.clear()
location.reload()
```

## Debug

Se algo não funcionar como esperado, verifique:

1. **Console do navegador**: Procure por erros JavaScript
2. **Network tab**: Verifique se há erros de rede
3. **React DevTools**: Inspecione o estado dos componentes
4. **LocalStorage**: Verifique se os dados estão sendo salvos corretamente

## Eventos Customizados

Você pode monitorar os eventos do tutorial no console:

```javascript
// Coloque isso no console antes de iniciar o teste
window.addEventListener('tutorial-stage-changed', (e) => {
  console.log('📊 Tutorial stage changed:', e)
})

window.addEventListener('tutorial-completed', (e) => {
  console.log('✅ Tutorial completed:', e)
})
```
