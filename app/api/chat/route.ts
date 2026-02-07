import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

// Configuração do provedor Groq
const groq = createOpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY?.trim() || '',
});

// Prompt Mestre com as regras do Phantom Chat
const systemPrompt = `
Você é o Assistente Virtual Oficial do Phantom Chat. Responda de forma curta e direta em Português.
REGRAS: 1 Token (₮) = R$ 1,00. Saque mínimo ₮ 100 via PIX (24h úteis). Rede efêmera.
`;

export async function POST(req: Request) {
    try {
        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
            return Response.json({ error: 'GROQ_API_KEY ausente.' }, { status: 401 });
        }

        const { messages } = await req.json();

        // Limpando as mensagens para garantir que só role e content sejam enviados
        // Isso evita o erro "unsupported content fields"
        const cleanMessages = messages.map((m: any) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: String(m.content)
        }));

        // Injetando o sistema como a primeira mensagem (mais compatível com alguns endpoints do Groq)
        const conversation = [
            { role: 'system', content: systemPrompt },
            ...cleanMessages
        ];

        const { text } = await generateText({
            model: groq('llama3-8b-8192'),
            messages: conversation,
            // Removi o campo 'system' separado para usar o formato de array de mensagens puro
        });

        return Response.json({ text });
    } catch (error: any) {
        console.error('Erro na API Groq:', error);

        return Response.json({
            text: `🤖 Olá! Estamos com uma oscilação técnica (Log: ${error.message}). Já estamos resolvendo! Lembre-se: Saque mínimo ₮100 e 1 Token = R$1,00.`
        });
    }
}
