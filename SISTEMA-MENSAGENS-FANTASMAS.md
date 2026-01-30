# 👻 Como Funciona: Mensagens Fantasmas (Phantom Messages)

## 🎯 Conceito do Phantom Chat:

O app já tem a funcionalidade de **mensagens que desaparecem** implementada!

---

## 🔍 Como Funciona Atualmente:

### **Campos da Mensagem:**

```typescript
interface Message {
  id: string
  content: string
  senderId: string
  receiverId: string
  timestamp: Date
  isRead: boolean
  isRevealed: boolean    // ← Controla se mensagem foi revelada
  expiresAt?: Date       // ← Quando vai expirar
  expiresIn?: number     // ← Tempo até expirar (segundos)
  type: 'text' | 'image'
  imageUrl?: string
  allowedNicknames?: string[]
}
```

---

## 👻 Sistema de Revelação:

### **Estado 1: Mensagem Oculta** 🔒
```
Cida envia mensagem para Lito
   ↓
isRevealed: false  ← Mensagem está OCULTA
   ↓
Lito vê: [Mensagem Borrada/Blur]
   ↓
Lito SEGURA (long press) a mensagem
   ↓
Barra de progresso aparece (3 segundos)
```

### **Estado 2: Mensagem Revelada** 👁️
```
Lito segura por 3 segundos
   ↓
isRevealed: true  ← Mensagem REVELADA
   ↓
Mensagem aparece clara por alguns segundos
   ↓
Depois some/blur novamente
```

---

## ⏱️ Sistema de Expiração:

### **Opção 1: Tempo de Leitura**
```javascript
expiresIn: 10  // 10 segundos após ser revelada

Fluxo:
1. Mensagem chega (oculta)
2. Usuário revela (segura)
3. Timer começa: 10 segundos
4. Após 10s: mensagem some ou volta a ficar oculta
```

### **Opção 2: Data/Hora Específica**
```javascript
expiresAt: new Date('2026-01-30 22:00:00')

Fluxo:
1. Mensagem chega
2. Quando chegar a data/hora
3. Mensagem é deletada automaticamente
```

---

## 🔄 Como Vai Funcionar com Supabase:

### **Cenário Completo:**

**1. Cida Envia Mensagem:**
```typescript
// Salvando no Supabase
{
  id: "msg-123",
  content: "Oi Lito! 👻",
  senderId: "cida-id",
  receiverId: "lito-id",
  isRevealed: false,        // ← Oculta por padrão
  expiresIn: 10,            // ← Some após 10s de leitura
  timestamp: new Date()
}
```

**2. Lito Recebe:**
```typescript
// Carrega do Supabase
- Mensagem está oculta (blur)
- Lito vê: [Mensagem borrada]
```

**3. Lito Revela:**
```typescript
// Segura por 3 segundos
- Barra de progresso: ████░░░░ 60%
- Quando completa: isRevealed = true

// Atualiza no Supabase
UPDATE messages 
SET is_revealed = true,
    revealed_at = NOW()
WHERE id = 'msg-123'
```

**4. Timer de Expiração:**
```typescript
// Após 10 segundos de leitura
setTimeout(() => {
  // Opção A: Deletar do banco
  DELETE FROM messages WHERE id = 'msg-123'
  
  // Opção B: Marcar como expirada
  UPDATE messages 
  SET expired = true
  WHERE id = 'msg-123'
}, 10000)
```

---

## 🎨 Visual do Sistema:

### **Mensagem Não Revelada:**
```
┌────────────────────────────┐
│  ████████████████████████  │  ← Blur/Borrado
│  ████████████████████████  │
│  Hold to reveal...         │  ← Instrução
└────────────────────────────┘
```

### **Revelando (Segurando):**
```
┌────────────────────────────┐
│  ████░░░░░░░░░░░░░░░░░░░░  │  ← Blur diminuindo
│  ▓▓▓▓░░░░░░░░░░░░░░░░░░░░  │
│  ████████████░░░░ 60%      │  ← Barra progresso
└────────────────────────────┘
```

### **Revelada:**
```
┌────────────────────────────┐
│  Oi Lito! 👻               │  ← Mensagem clara
│                            │
│  Expires in 7s...          │  ← Timer
└────────────────────────────┘
```

### **Expirada:**
```
┌────────────────────────────┐
│  [Mensagem expirada]       │  ← Não pode mais ver
│  ou                        │
│  [Deletada]                │
└────────────────────────────┘
```

---

## 💾 Estrutura no Supabase:

### **Tabela `messages`:**

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  content TEXT NOT NULL,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  is_revealed BOOLEAN DEFAULT false,
  revealed_at TIMESTAMP,
  expires_in INTEGER,        -- segundos
  expires_at TIMESTAMP,      -- ou data específica
  expired BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  type VARCHAR(10) DEFAULT 'text'
);
```

---

## 🔧 Implementação com Supabase:

### **1. Enviar Mensagem:**
```typescript
async function sendMessage(message: Message) {
  // Salvar no Supabase
  const { data, error } = await supabase
    .from('messages')
    .insert({
      content: message.content,
      sender_id: message.senderId,
      receiver_id: message.receiverId,
      is_revealed: false,      // Sempre oculta no início
      expires_in: 10,          // 10 segundos após revelar
      type: message.type
    })
  
  // Também salvar localmente (cache)
  localStorage.setItem(`phantom-messages-${receiverId}`, ...)
}
```

### **2. Revelar Mensagem:**
```typescript
async function revealMessage(messageId: string) {
  // Atualizar no Supabase
  await supabase
    .from('messages')
    .update({
      is_revealed: true,
      revealed_at: new Date()
    })
    .eq('id', messageId)
  
  // Iniciar timer de expiração
  startExpirationTimer(messageId, 10) // 10 segundos
}
```

### **3. Timer de Expiração:**
```typescript
function startExpirationTimer(messageId: string, seconds: number) {
  setTimeout(async () => {
    // Deletar do Supabase
    await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
    
    // Remover localmente
    // Atualizar UI
  }, seconds * 1000)
}
```

---

## ⚙️ Configurações Possíveis:

### **Opção 1: Tempo Fixo**
```typescript
// Todas mensagens expiram em 10s após leitura
expiresIn: 10
```

### **Opção 2: Usuário Escolhe**
```typescript
// Ao enviar, escolhe o tempo
expiresIn: 5   // 5 segundos
expiresIn: 30  // 30 segundos
expiresIn: 60  // 1 minuto
```

### **Opção 3: Mensagens Permanentes**
```typescript
// Sem expiração
expiresIn: null
// Mensagem fica salva
```

---

## 🎯 Benefícios com Supabase:

### **✅ Vantagens:**

1. **Sincronização:**
   - Lito revela mensagem no celular
   - Status sincroniza automaticamente
   - PC também mostra como revelada

2. **Expiração Confiável:**
   - Timer roda no servidor
   - Mesmo se fechar o app, mensagem expira
   - Não depende do navegador estar aberto

3. **Histórico:**
   - Pode ver quando mensagem foi revelada
   - Pode ver quando expirou
   - Útil para debug/analytics

4. **Realtime:**
   - Notificação instantânea de nova mensagem
   - Vê quando outra pessoa está digitando
   - Vê quando mensagem foi lida/revelada

---

## 🚀 Resumo:

**Funcionalidade JÁ existe:**
- ✅ Mensagens com blur/ocultas
- ✅ Long press para revelar
- ✅ Timer de expiração
- ✅ Barra de progresso

**O que precisa fazer:**
- 🔧 Conectar com Supabase
- 🔧 Sincronizar entre usuários
- 🔧 Timer de expiração no servidor

**Comportamento:**
```
1. Cida envia → Salva no Supabase (oculta)
2. Lito recebe → Vê blur
3. Lito segura → Revela (atualiza Supabase)
4. Timer 10s → Mensagem some (deleta do Supabase)
```

---

## 💡 **Resposta à Sua Pergunta:**

**"Como vai funcionar?"**

**EXATAMENTE IGUAL ao que já existe!** 🎉

A única diferença é que:
- **Antes:** Mensagens salvas só no navegador
- **Depois:** Mensagens salvas no Supabase (sincronizam)

**O comportamento de "sumir" continua o mesmo:**
1. Mensagem chega oculta (blur)
2. Usuário segura para revelar
3. Após X segundos, mensagem some
4. Não pode mais ver

**A vantagem:** Agora funciona entre usuários diferentes! 🚀

---

**Quer que eu implemente a sincronização mantendo essa funcionalidade?** 

Sim ou não? 😊
