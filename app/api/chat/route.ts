export async function POST(req: Request) {
    try {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            return Response.json({ error: 'Configuração GROQ_API_KEY ausente.' }, { status: 401 });
        }

        const { messages } = await req.json();

        // Limpeza das mensagens
        const cleanMessages = messages
            .filter((m: any) => m.content && String(m.content).trim() !== '')
            .map((m: any) => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: String(m.content).trim()
            }));

        const systemPrompt = "Você é o Assistente Virtual Oficial do Phantom Chat. 1 Token (₮) = R$ 1,00. Saque mínimo ₮ 100 via PIX (24h úteis). Rede efêmera e privada. Responda em Português de forma curta e direta.";

        const payload = {
            model: "llama-3.1-8b-instant", // Modelo atualizado e ativo
            messages: [
                { role: "system", content: systemPrompt },
                ...cleanMessages
            ],
            temperature: 0.7,
            max_tokens: 500
        };

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey.trim()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Erro Groq API:', data);
            throw new Error(data.error?.message || 'Erro na comunicação');
        }

        return Response.json({
            text: data.choices[0].message.content
        });

    } catch (error: any) {
        console.error('Erro Chat:', error);

        return Response.json({
            text: `🤖 Olá! Estamos com um ajuste técnico (${error.message}). Mas posso informar: 1 Token = R$1,00, saque mínimo ₮100 via PIX!`
        });
    }
}
