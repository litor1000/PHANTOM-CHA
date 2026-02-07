require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const chatbotRoutes = require('./src/routes/chatbot-routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Rotas
app.use('/api/chatbot', chatbotRoutes);

// Rota de teste
app.get('/', (req, res) => {
  res.send('Chatbot API está funcionando! Acesse /api/chatbot/test para testar.');
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🤖 Servidor do chatbot rodando na porta ${PORT}`);
  console.log(`📝 Acesse http://localhost:${PORT} para testar`);
});
