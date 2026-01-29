# Sistema de Tutorial Interativo - Phantom Chat

## Visão Geral

O sistema de tutorial foi implementado para ensinar novos usuários como usar o aplicativo Phantom Chat através de um bot interativo que guia os usuários passo a passo.

## Como Funciona

### 1. Primeiro Acesso

Quando um usuário faz cadastro e entra pela primeira vez no app:
- Um bot chamado "Tutorial Bot" (🤖) é criado automaticamente
- Aparece na lista de conversas com 1 mensagem não lida
- O bot está pronto para iniciar o tutorial

### 2. Abertura da Conversa

Quando o usuário abre o chat do Tutorial Bot:
- **Mensagem de boas-vindas** é exibida (já revelada)
- Introduz o bot e explica que mensagens são secretas
- Automaticamente, o bot envia mais 2 mensagens:
  - Instruções sobre como revelar mensagens
  - Uma mensagem de teste ofuscada

### 3. Tutorial Progressivo

O tutorial avança em estágios baseados na interação do usuário:

#### Estágio 1: Greeting (Saudação)
- Mensagem: Apresentação do bot
- Estado: Revelada automaticamente
- Ação: Espera o usuário abrir o chat

#### Estágio 2: Test Message (Mensagem de Teste)
- Mensagem de instrução: Como revelar mensagens
- Mensagem de teste: Ofuscada, esperando ser revelada
- Estado: Aguardando interação do usuário
- Ação: Usuário deve tocar e segurar para revelar

#### Estágio 3: Photo Instructions (Instruções de Foto)
Ativado quando o usuário revela a mensagem de teste:
- Mensagem de parabéns e instrução sobre fotos
- Mensagem com foto de teste ofuscada
- Estado: Aguardando revelação da foto
- Ação: Usuário deve tocar e segurar na foto

#### Estágio 4: Congratulations (Parabéns)
Ativado quando o usuário revela a foto:
- Mensagem final de parabéns
- Informa que a conversa será apagada
- Estado: Aguardando leitura
- Ação: Após 8 segundos, marca tutorial como completo

#### Estágio 5: Completed (Concluído)
- Remove o bot da lista de conversas
- Remove todas as mensagens do tutorial
- Limpa os dados do tutorial do localStorage
- Retorna o usuário para a lista de conversas

## Arquivos Envolvidos

### 1. `lib/bot-data.ts`
Define o bot e todas as mensagens do tutorial:
- `TUTORIAL_BOT`: Dados do bot
- `TUTORIAL_MESSAGES`: Todas as mensagens organizadas por estágio
- `createTutorialConversation()`: Função para criar a conversa inicial

### 2. `hooks/use-tutorial.ts`
Hook customizado que gerencia a lógica do tutorial:
- `getTutorialStage()`: Obtém o estágio atual
- `setTutorialStage()`: Avança para próximo estágio
- `getTutorialMessages()`: Retorna mensagens do estágio atual
- `handleMessageRevealed()`: Processa quando mensagem é revelada
- `handleConversationOpened()`: Processa quando usuário abre o chat
- `isTutorialCompleted()`: Verifica se tutorial foi concluído

### 3. `app/page.tsx`
Página principal que cria o bot no primeiro acesso:
- Verifica se é primeiro acesso (`phantom-onboarded`)
- Cria conversa com Tutorial Bot
- Adiciona apenas a mensagem de saudação inicial

### 4. `components/chat/chat-view.tsx`
Componente de chat que integra o tutorial:
- Detecta quando é o Tutorial Bot
- Escuta eventos de mudança de estágio
- Atualiza mensagens dinamicamente
- Remove o bot quando tutorial é concluído

## Eventos Customizados

O sistema usa eventos customizados do navegador para comunicação:

### `tutorial-stage-changed`
Disparado quando o estágio do tutorial muda:
- Atualiza as mensagens exibidas
- Salva novo estado no localStorage

### `tutorial-completed`
Disparado quando o tutorial é concluído:
- Remove bot da lista de conversas
- Limpa dados do tutorial
- Retorna usuário para lista de conversas

## LocalStorage

O sistema usa as seguintes chaves no localStorage:

- `phantom-onboarded`: Flag que indica se usuário já passou pelo onboarding
- `phantom-tutorial-stage-{userId}`: Estágio atual do tutorial para o usuário
- `phantom-messages-bot-tutorial`: Mensagens do tutorial
- `phantom-conversations`: Lista de conversas (inclui bot até conclusão)
- `phantom-contacts`: Lista de contatos (inclui bot até conclusão)

## Fluxo Completo

```
Primeiro Acesso → Bot Criado
       ↓
Usuário Abre Chat do Bot → Mensagens Iniciais Aparecem
       ↓
Usuário Revela Mensagem de Teste → Bot Envia Instruções de Foto
       ↓
Usuário Revela Foto → Bot Envia Parabéns
       ↓
Aguarda 8 segundos → Tutorial Concluído
       ↓
Bot é Removido Automaticamente
```

## Personalização

Para personalizar as mensagens do tutorial, edite o objeto `TUTORIAL_MESSAGES` em `lib/bot-data.ts`.

Para ajustar os tempos de transição, modifique os valores de `setTimeout` em:
- `hooks/use-tutorial.ts`: Delay entre estágios (1000ms)
- `components/chat/chat-view.tsx`: Delay para remoção do bot (3000ms)
- `hooks/use-tutorial.ts`: Delay para completar tutorial (8000ms)

## Características Especiais

1. **Progressão Automática**: Tutorial avança automaticamente baseado nas ações do usuário
2. **Não Intrusivo**: Bot se remove automaticamente após conclusão
3. **Persistente**: Progresso é salvo no localStorage
4. **Responsivo**: Atualiza em tempo real conforme usuário interage
5. **Educativo**: Ensina através da prática, não apenas teoria
