import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

// Configuração do provedor Groq usando a biblioteca OpenAI compatível
const groq = createOpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY?.trim() || '',
});

// Prompt Mestre com as regras do Phantom Chat
const systemPrompt = `
Você é o Assistente Virtual Oficial do Phantom Chat, uma rede de mensagens ultra-privada, efêmera e segura.
Seu tom de voz é profissional, elegante e mantém um leve ar de mistério ("Phantom Style").

REGRAS:
1. TOKENS (₮): 1 Token = R$ 1,00.
2. SAQUE MÍNIMO: ₮ 100 via PIX (processado em até 24h úteis).
3. PRIVACIDADE: Rede 100% efêmera. Mensagens somem após lidas.
4. SEGURANÇA: Saques exigem confirmação biométrica.

Responda sempre em Português do Brasil, de forma muito curta e direta.
`;

export async function POST(req: Request) {
    try {
        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
            return Response.json({ error: 'Chave de API do Groq ausente no Vercel.' }, { status: 401 });
        }

        const { messages } = await req.json();

        // Usando o modelo Llama 3 8b do Groq pela sua velocidade e qualidade
        const { text } = await generateText({
            model: groq('llama3-8b-8192'),
            system: systemPrompt,
            messages,
        });

        return Response.json({ text });
    } catch (error: any) {
        console.error('Erro na API Groq:', error);

        // Fallback amigável
        return Response.json({
            text: "🤖 Olá! Estou atualizando meus sistemas. Lembre-se: 1 Token vale R$ 1,00, saque mínimo ₮ 100 e nossa rede é 100% privada!"
        });
    }
}
