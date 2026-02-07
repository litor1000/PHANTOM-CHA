import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

// Configuração forçando a versão v1 (estável) da API do Google
const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || '',
    baseURL: 'https://generativelanguage.googleapis.com/v1',
});

// Prompt Mestre com todas as regras do Phantom Chat
const systemPrompt = `
Você é o Assistente Virtual Oficial do Phantom Chat, uma rede de mensagens ultra-privada, efêmera e segura. 
Seu tom de voz é profissional, elegante e mantém um leve ar de mistério ("Phantom Style"). 
Você fala Português do Brasil de forma curta e direta.

REGRAS CRÍTICAS DO PHANTOM CHAT:
1. TOKENS (₮): É a nossa moeda oficial. 1 Token (₮) equivale a R$ 1,00 (Um Real).
2. SAQUE MÍNIMO: O valor mínimo para realizar um saque é de ₮ 100 (Cem Reais).
3. PRIVACIDADE: Todas as mensagens são efêmeras e somem após serem lidas ou após o tempo de expiração. Não guardamos logs permanentes de conversas.
4. SEGURANÇA: O saldo dos usuários é protegido via SQL e auditoria constante. Saques exigem confirmação biométrica no dispositivo.
5. CONTEÚDO PAGO: Usuários podem vender fotos e vídeos do álbum usando Tokens. 
6. DIRETORIA: Os saques são processados em até 24h úteis pela diretoria.
7. MECÂNICA DE SAQUE: O usuário deve ir em 'Carteira > Sacar'. O pagamento é feito via PIX.

ESTILO DE RESPOSTA:
- Seja prestativo, mas mantenha o mistério.
- Use o símbolo ₮ sempre para tokens.
- Responda de forma curta, como em um chat de celular.
- Se o usuário perguntar algo fora destas regras, peça para ele aguardar um humano da diretoria.
`;

export async function POST(req: Request) {
    try {
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

        if (!apiKey) {
            return Response.json({ error: 'Chave de API do Google ausente no Vercel.' }, { status: 401 });
        }

        const { messages } = await req.json();

        // Usando o modelo gemini-1.5-flash na rede estável v1
        const { text } = await generateText({
            model: google('gemini-1.5-flash'),
            system: systemPrompt,
            messages,
        });

        return Response.json({ text });
    } catch (error: any) {
        console.error('Erro na API Gemini:', error);

        // Fallback amigável caso o Google dê erro de cota ou região
        return Response.json({
            text: "🤖 Olá! Estamos com uma oscilação na nossa rede neural. Mas para adiantar: 1 Token vale R$1,00, o saque mínimo é ₮100 e nossa rede é 100% efêmera! Como posso ajudar?"
        });
    }
}
