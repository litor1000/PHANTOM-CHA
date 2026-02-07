import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

// Usando a rota v1 (estável) para evitar erros de região/versão
const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || '',
    baseURL: 'https://generativelanguage.googleapis.com/v1',
});

export async function POST(req: Request) {
    try {
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

        if (!apiKey) {
            return Response.json({ error: 'Chave de API ausente.' }, { status: 401 });
        }

        const { messages } = await req.json();

        // Em vez de 'systemInstruction' (que dá erro na v1), 
        // injetamos as regras como a primeira mensagem da conversa
        const rulesPrompt = `
    INSTRUÇÕES DE SISTEMA (PHANTOM CHAT):
    - Você é o Assistente Virtual Oficial.
    - Regras: 1 Token (₮) = R$ 1,00. Saque mínimo = ₮ 100 via PIX (24h úteis).
    - Privacidade: Rede 100% efêmera. Mensagens somem após lidas.
    - Estilo: Respostas curtas, diretas e profissionais em Português.
    `;

        const instructionsMessage = {
            role: 'user',
            content: rulesPrompt
        };

        const conversation = [instructionsMessage, ...messages];

        const { text } = await generateText({
            model: google('gemini-1.5-flash'),
            messages: conversation,
        });

        return Response.json({ text });
    } catch (error: any) {
        console.error('Erro Final Gemini:', error);

        // Fallback com as informações principais para nunca deixar o usuário na mão
        return Response.json({
            text: "🤖 Olá! Estou configurando minha rede neural, mas já posso te ajudar: o valor do Token é 1:1 (R$1,00), o saque mínimo via PIX é de ₮100 e todas as nossas mensagens são ultra-privadas e efêmeras! Como posso te ajudar hoje?"
        });
    }
}
