# 📱 Guia de Transformação Mobile (Capacitor)

Seu Phantom Chat agora é oficialmente um aplicativo Híbrido Nativo! 🚀

## O que foi implementado:
1.  **Motor Capacitor**: O app agora pode ser gerado como um APK/Bundle nativo para Android.
2.  **Haptics (Vibração)**: Todos os botões principais agora vibram levemente ao serem clicados.
3.  **Sons de Sistema**: Adicionados sons sutis de "click" para ações interativas.
4.  **Notificações Push**: Preparado para receber mensagens via Firebase (FCM).
5.  **Suporte Offline**: O app agora tem um Service Worker que cacheia arquivos essenciais.
6.  **Splash Screen & Status Bar**: Personalizados com a identidade visual do Phantom (Roxo/Dark).

---

## Como Rodar o Gerador Mobile:

Toda vez que você fizer uma alteração no código web e quiser ver no celular, use este comando único que eu criei:

```bash
npm run android
```

### O que este comando faz?
1.  Faz o **Build estático** do seu projeto Next.js (gera a pasta `/out`).
2.  **Sincroniza** os arquivos com o projeto Android.
3.  **Abre o Android Studio** automaticamente para você gerar o APK ou rodar no seu celular.

---

## Configuração do Firebase (Para Push Notifications):
Para as notificações funcionarem no Android, você precisa:
1.  Ir ao console do [Firebase](https://console.firebase.google.com/).
2.  Criar um projeto e baixar o arquivo `google-services.json`.
3.  Colocar esse arquivo na pasta: `android/app/`.

---

## Próximos Passos recomendados:
- **Build de Produção**: No Android Studio, vá em `Build > Build Bundle(s) / APK(s) > Build APK(s)`.
- **iOS**: Quando quiser rodar no iPhone, basta rodar `npx cap add ios` (requer Mac).

Divirta-se com seu novo App Nativo! 👻📱🛡️
