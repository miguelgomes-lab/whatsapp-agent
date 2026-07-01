# WhatsApp Agent — TecniMoove

Agente de IA que gera rascunhos de resposta no teu estilo para mensagens WhatsApp recebidas.

## Setup

### 1. Firebase
1. Cria projeto em console.firebase.google.com
2. Ativa **Firestore** (modo produção)
3. Settings → Service Accounts → **Generate new private key** (guarda o JSON)
4. Cria índice composto no Firestore:
   - Coleção: `messages` | Campos: `phone ASC`, `createdAt DESC`

### 2. Z-API
1. Na tua instância Z-API → **Webhooks**
2. Webhook de mensagens recebidas: `https://SEU-DOMINIO.vercel.app/api/webhook`
3. Ativa: "Receber mensagens"

### 3. Vercel
Adiciona estas Environment Variables:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (com as \n do JSON)
- `ANTHROPIC_API_KEY`
- `ZAPI_INSTANCE_ID`
- `ZAPI_TOKEN`
- `ZAPI_CLIENT_TOKEN`

## Uso
- Dashboard em `https://SEU-PROJETO.vercel.app`
- Cada mensagem nova aparece com rascunho IA
- Edita se necessário → **Enviar**
- Atualiza automaticamente a cada 15 segundos
