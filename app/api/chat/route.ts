import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

// Configuração robusta do provedor Google
const googleProvider = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || '',
});

// Personalidade e regras do Phantom Chat
const systemPrompt = `
Você é o Assistente Virtual oficial do Phantom Chat. Responda de forma curta e direta.
REGRAS: Saque mínimo ₮ 100. 1 Token = R$ 1,00. Mensagens efêmeras.
`;

export async function POST(req: Request) {
    try {
        const rawApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

        if (!rawApiKey) {
            return Response.json({ error: 'Chave de API ausente no Vercel (GOOGLE_GENERATIVE_AI_API_KEY)' }, { status: 401 });
        }

        const { messages } = await req.json();

        const { text } = await generateText({
            model: googleProvider('gemini-1.5-flash'),
            system: systemPrompt,
            messages,
        });

        return Response.json({ text });
    } catch (error: any) {
        console.error('ERRO GEMINI:', error);

        // Retornar o erro real para diagnóstico
        return Response.json({
            error: error.message || 'Erro desconhecido na API do Google',
            status: error.status
        }, { status: error.status || 500 });
    }
}
