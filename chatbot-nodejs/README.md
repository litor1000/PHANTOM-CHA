# 🤖 Chatbot com IA para Node.js

Chatbot inteligente usando OpenAI GPT para atendimento ao cliente, desenvolvido em Node.js.

## 📋 Funcionalidades

- ✅ Integração com OpenAI GPT-3.5/GPT-4
- ✅ Interface web responsiva e moderna
- ✅ Histórico de conversação
- ✅ Contexto personalizável para seu app
- ✅ API REST para integração
- ✅ Fácil configuração

## 🚀 Como Usar

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

1. Copie o arquivo `.env.example` para `.env`:
```bash
copy .env.example .env
```

2. Edite o arquivo `.env` e configure:

```env
# Obtenha sua chave em: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-sua-chave-aqui

# Porta do servidor
PORT=3000

# Personalize com informações do seu app
APP_NAME=Meu App Incrível
APP_DESCRIPTION=Um aplicativo que ajuda usuários a gerenciar suas tarefas
APP_FEATURES=Login, Cadastro, Dashboard, Tarefas, Relatórios
```

### 3. Obter Chave da API OpenAI

1. Acesse: https://platform.openai.com/api-keys
2. Faça login ou crie uma conta
3. Clique em "Create new secret key"
4. Copie a chave e cole no arquivo `.env`

**Importante:** Você precisará adicionar créditos na sua conta OpenAI para usar a API.

### 4. Iniciar o Servidor

**Modo desenvolvimento (com auto-reload):**
```bash
npm run dev
```

**Modo produção:**
```bash
npm start
```

### 5. Testar o Chatbot

Abra seu navegador e acesse:
- Interface web: http://localhost:3000
- Teste da API: http://localhost:3000/api/chatbot/test

## 📡 API Endpoints

### GET /api/chatbot/test
Testa se o chatbot está configurado corretamente.

**Resposta:**
```json
{
  "success": true,
  "message": "Chatbot API está funcionando!",
  "configured": true
}
```

### POST /api/chatbot/message
Envia uma mensagem para o chatbot.

**Request:**
```json
{
  "message": "Como faço para criar uma conta?",
  "conversationHistory": [
    {"role": "user", "content": "Olá"},
    {"role": "assistant", "content": "Olá! Como posso ajudar?"}
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Para criar uma conta, siga estes passos: 1. Clique em 'Cadastrar'..."
}
```

## 🔧 Integração com seu App

### Exemplo em JavaScript (Frontend)

```javascript
async function enviarMensagem(mensagem, historico = []) {
  try {
    const response = await fetch('http://localhost:3000/api/chatbot/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: mensagem,
        conversationHistory: historico
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Resposta do bot:', data.message);
      return data.message;
    }
  } catch (error) {
    console.error('Erro:', error);
  }
}

// Usar
enviarMensagem('Como funciona o login?');
```

### Exemplo em React

```jsx
import { useState } from 'react';

function Chatbot() {
  const [mensagem, setMensagem] = useState('');
  const [historico, setHistorico] = useState([]);

  const enviarMensagem = async () => {
    const response = await fetch('http://localhost:3000/api/chatbot/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: mensagem,
        conversationHistory: historico
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      setHistorico([
        ...historico,
        { role: 'user', content: mensagem },
        { role: 'assistant', content: data.message }
      ]);
    }
  };

  return (
    <div>
      <input 
        value={mensagem} 
        onChange={(e) => setMensagem(e.target.value)}
      />
      <button onClick={enviarMensagem}>Enviar</button>
    </div>
  );
}
```

## 📱 Converter para App Nativo (APK)

Para converter seu app web em APK, você pode usar:

### Opção 1: Capacitor (Recomendado)
```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npx cap add android
npx cap sync
npx cap open android
```

### Opção 2: Cordova
```bash
npm install -g cordova
cordova create meuapp
cordova platform add android
cordova build android
```

### Opção 3: React Native WebView
Se seu app principal é React Native, use WebView para incorporar o chatbot.

## 🎨 Personalização

### Modificar o Contexto do Chatbot

Edite o arquivo `.env` para personalizar:

```env
APP_NAME=Meu E-commerce
APP_DESCRIPTION=Plataforma de vendas online com produtos variados
APP_FEATURES=Catálogo de produtos, Carrinho, Pagamento, Rastreamento
CHATBOT_INSTRUCTIONS=Seja especialista em e-commerce. Ajude com dúvidas sobre produtos, pagamentos e entregas.
```

### Modificar a Interface

Edite o arquivo `public/index.html` para personalizar cores, layout e estilo.

## 💰 Custos da API OpenAI

- **GPT-3.5-turbo**: ~$0.002 por 1000 tokens (muito barato)
- **GPT-4**: ~$0.03 por 1000 tokens

Para a maioria dos casos, GPT-3.5-turbo é suficiente e muito econômico.

## 🔒 Segurança

- ⚠️ **NUNCA** compartilhe sua `OPENAI_API_KEY`
- ⚠️ **NUNCA** commite o arquivo `.env` no Git
- ✅ Use variáveis de ambiente em produção
- ✅ Implemente rate limiting para evitar abuso
- ✅ Adicione autenticação se necessário

## 📚 Estrutura do Projeto

```
chatbot-nodejs/
├── src/
│   ├── controllers/
│   │   └── chatbot-controller.js    # Lógica de controle das rotas
│   ├── services/
│   │   └── chatbot-service.js       # Integração com OpenAI
│   └── routes/
│       └── chatbot-routes.js        # Definição das rotas
├── public/
│   └── index.html                   # Interface web do chat
├── .env.example                     # Exemplo de configuração
├── .gitignore                       # Arquivos ignorados pelo Git
├── package.json                     # Dependências do projeto
├── server.js                        # Servidor Express
└── README.md                        # Este arquivo
```

## 🆘 Problemas Comuns

### Erro: "OPENAI_API_KEY não configurada"
- Verifique se você criou o arquivo `.env`
- Verifique se a chave está correta
- Reinicie o servidor após alterar o `.env`

### Erro: "Insufficient quota"
- Você precisa adicionar créditos na sua conta OpenAI
- Acesse: https://platform.openai.com/account/billing

### Chatbot não responde
- Verifique se o servidor está rodando
- Abra o console do navegador (F12) para ver erros
- Teste o endpoint: http://localhost:3000/api/chatbot/test

## 📞 Suporte

Se tiver dúvidas:
1. Leia a documentação da OpenAI: https://platform.openai.com/docs
2. Verifique os logs do servidor
3. Teste os endpoints da API

## 📄 Licença

MIT - Livre para uso pessoal e comercial.

---

**Desenvolvido com ❤️ para facilitar o atendimento ao cliente**
