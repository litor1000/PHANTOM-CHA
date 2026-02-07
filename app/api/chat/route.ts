export async function POST(req: Request) {
    try {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            return Response.json({ error: 'Configuração GROQ_API_KEY ausente.' }, { status: 401 });
        }

        const { messages } = await req.json();

        // Limpeza absoluta das mensagens para o formato exato que a Groq exige
        const cleanMessages = messages
            .filter((m: any) => m.content && String(m.content).trim() !== '')
            .map((m: any) => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: String(m.content).trim()
            }));

        // Injeção do sistema como primeira mensagem para máxima compatibilidade
        const systemPrompt = "Você é o Assistente Virtual Oficial do Phantom Chat. 1 Token (₮) = R$ 1,00. Saque mínimo ₮ 100 via PIX (24h úteis). Rede efêmera. Responda em Português de forma curta.";

        const payload = {
            model: "llama3-8b-8192",
            messages: [
                { role: "system", content: systemPrompt },
                ...cleanMessages
            ],
            temperature: 0.7,
            max_tokens: 500
        };

        // Chamada manual via Fetch para evitar campos extras de bibliotecas
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
            throw new Error(data.error?.message || 'Erro na comunicação com a Groq');
        }

        return Response.json({
            text: data.choices[0].message.content
        });

    } catch (error: any) {
        console.error('Erro Final Chat:', error);

        // Fallback amigável com as regras de negócio
        return Response.json({
            text: "🤖 Olá! Estamos finalizando a calibragem do nosso suporte. Mas já posso ajudar: 1 Token vale R$1,00, o saque mínimo é ₮100 via PIX e todas as mensagens são efêmeras! Em que posso ajudar?"
        });
    }
}
