import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || '',
});

export async function POST(req: Request) {
    try {
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!apiKey) return Response.json({ error: 'Chave ausente' }, { status: 401 });

        const { messages } = await req.json();

        const rulesPrompt = `Você é o Assistente do Phantom Chat. 1 Token (₮) = R$ 1,00. Saque mínimo ₮ 100. Rede efêmera.`;

        const { text } = await generateText({
            model: google('gemini-1.5-flash'),
            system: rulesPrompt,
            messages: messages,
        });

        return Response.json({ text });
    } catch (error: any) {
        console.error('ERRO:', error);
        return Response.json({
            text: `🤖 Olá! Estamos com uma oscilação (Erro: ${error.message}). Informações: 1 Token = R$1,00, Saque mínimo ₮100.`
        });
    }
}
