import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

// Configuração do provedor Groq
const groq = createOpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY?.trim() || '',
});

// Prompt Mestre com as regras do Phantom Chat
const systemPrompt = `Você é o Assistente Virtual Oficial do Phantom Chat. 
Regras: 1 Token (₮) = R$ 1,00. Saque mínimo ₮ 100 via PIX (24h úteis). Rede efêmera.
Responda sempre em Português de forma curta e direta.`;

export async function POST(req: Request) {
    try {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) return Response.json({ error: 'Configuração ausente.' }, { status: 401 });

        const { messages } = await req.json();

        // FILTRO RIGOROSO: Groq odeia campos vazios ou propriedades extras
        const cleanMessages = messages
            .filter((m: any) => m.content && String(m.content).trim() !== '') // Remove vazios
            .map((m: any) => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: String(m.content).trim()
            }));

        const { text } = await generateText({
            model: groq('llama-3.1-8b-instant'), // Usando a versão mais atual e estável
            system: systemPrompt,
            messages: cleanMessages,
        });

        return Response.json({ text });
    } catch (error: any) {
        console.error('Erro na API Groq:', error);

        // Retornando erro técnico detalhado para diagnóstico em caso de falha
        return Response.json({
            text: `🤖 Olá! Ainda estamos ajustando a sintonia (Log: ${error.message}). Informações: Saque mínimo ₮100, 1 Token = R$1,00.`
        });
    }
}
