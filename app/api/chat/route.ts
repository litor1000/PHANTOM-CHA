import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

// Personalidade e regras do Phantom Chat
const systemPrompt = `
Você é o Assistente Virtual oficial do Phantom Chat, uma rede de mensagens ultra-privada e efêmera.
Sua missão é ajudar os usuários com elegância, mistério e precisão.

REGRAS:
1. TOKENS (₮): 1 Token = R$ 1,00.
2. SAQUE MÍNIMO: ₮ 100.
3. PRIVACIDADE: Mensagens efêmeras.
4. SAQUES: Processados em até 24h pela diretoria.

Responda sempre em Português, de forma curta e direta.
`;

export async function POST(req: Request) {
    try {
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

        if (!apiKey) {
            return Response.json({ error: 'Configure a chave API no Vercel.' }, { status: 401 });
        }

        const { messages } = await req.json();

        // Modelo estável e compatível
        const { text } = await generateText({
            model: google('gemini-1.5-flash'),
            system: systemPrompt,
            messages,
        });

        return Response.json({ text });
    } catch (error: any) {
        console.error('ERRO AO PROCESSAR IA:', error);

        // Fallback amigável em caso de erro técnico persistente
        return Response.json({
            text: "🤖 Olá! No momento estamos realizando uma manutenção rápida no nosso cérebro de IA. Mas pode ficar tranquilo: 1 Token vale R$1,00 e o saque mínimo é ₮100 via PIX!"
        });
    }
}
