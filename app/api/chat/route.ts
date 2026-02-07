import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Personalidade e regras do Phantom Chat
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
- Nunca invente regras fora destas citadas.
`;

export async function POST(req: Request) {
    try {
        if (!process.env.OPENAI_API_KEY) {
            return Response.json({ error: 'Configuração da OpenAI ausente (OPENAI_API_KEY) no Vercel.' }, { status: 401 });
        }

        const { messages } = await req.json();

        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo', // Escolhi o 3.5 turbo por ser estável e rápido para chat de suporte
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages
            ],
            temperature: 0.7,
            max_tokens: 500,
        });

        return Response.json({
            text: response.choices[0].message.content
        });
    } catch (error: any) {
        console.error('Erro na API OpenAI:', error);

        return Response.json({
            error: `Erro no ChatGPT: ${error.message || 'Erro Interno'}`,
            status: error.status
        }, { status: error.status || 500 });
    }
}
