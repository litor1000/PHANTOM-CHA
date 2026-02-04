
export async function sendToTelegram(message: string, imageUrl?: string) {
    const botToken = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
    const chatId = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
        console.warn('Telegram Bot Token ou Chat ID não configurados.');
        return;
    }

    try {
        if (imageUrl) {
            if (imageUrl.startsWith('data:')) {
                // Enviar imagem Base64 como arquivo
                const [meta, data] = imageUrl.split(',');
                const mime = meta.match(/:(.*?);/)?.[1] || 'image/jpeg';
                const binary = atob(data);
                const array = [];
                for (let i = 0; i < binary.length; i++) array.push(binary.charCodeAt(i));
                const blob = new Blob([new Uint8Array(array)], { type: mime });

                const formData = new FormData();
                formData.append('chat_id', chatId);
                formData.append('photo', blob, 'photo.jpg');
                formData.append('caption', message);
                formData.append('parse_mode', 'HTML');

                const response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
                    method: 'POST',
                    body: formData
                });
                return await response.json();
            } else {
                // Enviar imagem via URL pública
                const response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        photo: imageUrl,
                        caption: message,
                        parse_mode: 'HTML'
                    })
                });
                return await response.json();
            }
        } else {
            // Enviar apenas texto
            const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'HTML'
                })
            });
            return await response.json();
        }
    } catch (error) {
        console.error('Erro ao enviar para o Telegram:', error);
    }
}
