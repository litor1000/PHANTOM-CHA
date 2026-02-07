const chatbotService = require('../services/chatbot-service');

class ChatbotController {
  // Endpoint para enviar mensagem ao chatbot
  async sendMessage(req, res) {
    try {
      const { message, conversationHistory } = req.body;

      // Validar se a mensagem foi enviada
      if (!message || message.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Mensagem não pode estar vazia'
        });
      }

      // Verificar se a API está configurada
      if (!chatbotService.isConfigured()) {
        return res.status(500).json({
          success: false,
          error: 'Chatbot não está configurado. Configure a OPENAI_API_KEY no arquivo .env'
        });
      }

      // Enviar mensagem para o serviço
      const response = await chatbotService.sendMessage(
        message,
        conversationHistory || []
      );

      return res.json(response);
    } catch (error) {
      console.error('Erro no ChatbotController:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: 'Desculpe, ocorreu um erro. Por favor, tente novamente.'
      });
    }
  }

  // Endpoint de teste
  async test(req, res) {
    const isConfigured = chatbotService.isConfigured();
    
    return res.json({
      success: true,
      message: 'Chatbot API está funcionando!',
      configured: isConfigured,
      info: isConfigured 
        ? 'Chatbot está pronto para uso' 
        : 'Configure a OPENAI_API_KEY no arquivo .env para usar o chatbot'
    });
  }
}

module.exports = new ChatbotController();
