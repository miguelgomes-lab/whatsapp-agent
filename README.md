# WhatsApp Agent — TecniMoove

Servidor Node.js que conecta ao WhatsApp via Baileys, gera rascunhos com Claude AI e guarda no Firebase.

## Deploy no Render.com (gratuito)

### 1. Firebase
- console.firebase.google.com → novo projeto
- Ativa Firestore (modo produção)
- Settings → Service Accounts → Generate new private key

### 2. Render.com
- New → Web Service → ligar ao repo `miguelgomes-lab/whatsapp-agent`
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Adicionar disco: Mount Path `/opt/render/project/src/auth_info`
- Env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, ANTHROPIC_API_KEY

### 3. Ligar WhatsApp
- Nos logs do Render aparece o QR Code
- Lê com o WhatsApp → Dispositivos Ligados
- Sessão fica guardada no disco — só uma vez

## Índices Firestore
- Coleção `messages`: `phone ASC` + `createdAt ASC`
- Coleção `drafts`: `status ASC` + `createdAt DESC`
