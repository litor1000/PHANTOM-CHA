import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

// Configuração robusta do provedor Google
const googleProvider = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || '',
});

// Personalidade e regras do Phantom Chat
const systemPrompt = `
Você é o Assistente Virtual oficial do Phantom Chat, uma rede de mensagens ultra-privada e efêmera.
Sua missão é ajudar os usuários com elegância, mistério e precisão.

REGRAS CRÍTICAS DO PHANTOM CHAT:
1. TOKENS (₮): É a nossa moeda oficial. 1 Token (₮) equivale a R$ 1,00 (Um Real).
2. SAQUE MÍNIMO: O valor mínimo para realizar um saque é de ₮ 100 (Cem Reais).
3. PRIVACIDADE: Todas as mensagens são efêmeras e somem após serem lidas ou após o tempo de expiração. Não guardamos logs permanentes de conversas.
4. SEGURANÇA: O saldo dos usuários é protegido via SQL e auditoria constante. Saques exigem confirmação biométrica no dispositivo.
5. CONTEÚDO PAGO: Usuários podem vender fotos e vídeos do álbum usando Tokens. 
6. DIRETORIA: Os saques são processados em até 24h úteis pela diretoria.

ESTILO DE RESPOSTA:
- Seja prestativo, mas mantenha um tom profissional e levemente misterioso (phantom style).
- Use o símbolo ₮ para se referir a tokens.
- Se o usuário perguntar algo fora do contexto do app, tente gentilmente trazer o assunto de volta para o suporte ao Phantom.
- Nunca invente regras que não estão listadas acima.

Responda sempre em Português do Brasil. Responda de forma direta e curta, como em um chat de celular.
`;

export async function POST(req: Request) {
    try {
        const rawApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

        if (!rawApiKey) {
            return Response.json({
                error: 'Chave de API não configurada. Adicione GOOGLE_GENERATIVE_AI_API_KEY no Vercel.'
            }, { status: 401 });
        }

        const { messages } = await req.json();

        const { text } = await generateText({
            model: googleProvider('gemini-1.5-flash'),
            system: systemPrompt,
            messages,
        });

        return Response.json({ text });
    } catch (error: any) {
        console.error('Erro na API de Chat:', error);

        // Fallback para erros conhecidos do Google
        let message = 'Erro interno na IA';
        if (error.message?.includes('API key not valid')) message = 'Chave de API Inválida';
        if (error.status === 429) message = 'Limite de mensagens excedido (Quota)';

        return Response.json({
            error: message,
            details: error.message
        }, { status: error.status || 500 });
    }
}
