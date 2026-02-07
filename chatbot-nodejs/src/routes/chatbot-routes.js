const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbot-controller');

// Rota de teste
router.get('/test', (req, res) => chatbotController.test(req, res));

// Rota para enviar mensagem
router.post('/message', (req, res) => chatbotController.sendMessage(req, res));

module.exports = router;
