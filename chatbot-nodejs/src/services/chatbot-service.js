const OpenAI = require('openai');

class ChatbotService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Configuração do contexto do chatbot baseado nas variáveis de ambiente
    this.systemContext = this.buildSystemContext();
  }

  buildSystemContext() {
    const appName = process.env.APP_NAME || 'Nosso App';
    const appDescription = process.env.APP_DESCRIPTION || 'um aplicativo web';
    const appFeatures = process.env.APP_FEATURES || 'várias funcionalidades';
    const customInstructions = process.env.CHATBOT_INSTRUCTIONS || '';

    return `Você é um assistente virtual especializado em ajudar usuários do ${appName}.

Sobre o aplicativo:
${appDescription}

Principais funcionalidades:
${appFeatures}

Suas responsabilidades:
1. Responder dúvidas sobre como usar o aplicativo
2. Explicar funcionalidades de forma clara e detalhada
3. Fornecer instruções passo a passo quando necessário
4. Ser educado, prestativo e profissional
5. Se não souber algo específico, seja honesto e sugira entrar em contato com o suporte

${customInstructions}

Sempre responda em português do Brasil de forma clara e objetiva.`;
  }

  async sendMessage(userMessage, conversationHistory = []) {
    try {
      // Construir o histórico de mensagens
      const messages = [
        {
          role: 'system',
          content: this.systemContext
        },
        ...conversationHistory,
        {
          role: 'user',
          content: userMessage
        }
      ];

      // Fazer a chamada para a API da OpenAI
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo', // ou 'gpt-4' se você tiver acesso
        messages: messages,
        temperature: 0.7,
        max_tokens: 500
      });

      return {
        success: true,
        message: response.choices[0].message.content,
        usage: response.usage
      };
    } catch (error) {
      console.error('Erro no ChatbotService:', error);
      return {
        success: false,
        error: error.message,
        message: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.'
      };
    }
  }

  // Método para validar se a API key está configurada
  isConfigured() {
    return !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sua_chave_api_aqui';
  }
}

module.exports = new ChatbotService();
