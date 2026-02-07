import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

// Configuração forçando a versão v1 (estável) da API do Google
const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || '',
    baseURL: 'https://generativelanguage.googleapis.com/v1',
});

// Prompt Mestre com todas as regras do Phantom Chat
const systemPrompt = `
Você é o Assistente Virtual Oficial do Phantom Chat. Responda de forma curta e direta em Português.
REGRAS: 1 Token = R$ 1,00. Saque mínimo ₮ 100 via PIX (24h úteis). Rede efêmera.
`;

export async function POST(req: Request) {
    try {
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

        if (!apiKey) {
            return Response.json({ error: 'Chave de API do Google ausente no Vercel.' }, { status: 401 });
        }

        const { messages } = await req.json();

        const { text } = await generateText({
            model: google('gemini-1.5-flash'),
            system: systemPrompt,
            messages,
        });

        return Response.json({ text });
    } catch (error: any) {
        console.error('Erro na API Gemini:', error);

        // Retornando o erro técnico dentro da mensagem amigável para podermos diagnosticar no chat
        const technicalError = error.message || 'Erro de conexão';

        return Response.json({
            text: `🤖 Olá! Estamos com uma oscilação na nossa rede neural (Erro técnico: ${technicalError}). Mas para adiantar: 1 Token vale R$1,00, o saque mínimo é ₮100 e nossa rede é 100% efêmera! Como posso ajudar?`
        });
    }
}
