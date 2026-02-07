import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

// Configuração do provedor Groq
const groq = createOpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY?.trim() || '',
});

// Prompt Mestre com as regras do Phantom Chat
const systemPrompt = `
Você é o Assistente Virtual Oficial do Phantom Chat. Responda de forma curta e direta.
REGRAS: 1 Token (₮) = R$ 1,00. Saque mínimo ₮ 100 via PIX (24h úteis). Rede efêmera.
Responda sempre em Português.
`;

export async function POST(req: Request) {
    try {
        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
            return Response.json({ error: 'GROQ_API_KEY ausente no Vercel.' }, { status: 401 });
        }

        const { messages } = await req.json();

        const { text } = await generateText({
            model: groq('llama3-8b-8192'),
            system: systemPrompt,
            messages,
        });

        return Response.json({ text });
    } catch (error: any) {
        console.error('Erro na API Groq:', error);

        // Retornando erro técnico para diagnóstico
        return Response.json({
            text: `🤖 Olá! Estamos com uma oscilação (Erro técnico: ${error.message || 'Erro desconhecido'}). Informações: 1 Token = R$ 1,00, Saque mínimo ₮ 100.`
        });
    }
}
