import 'dotenv/config'
import express from 'express'
import fs from 'fs'
import path from 'path'
import {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import pino from 'pino'
import { getFirestore } from './firebase'
import { generateDraft } from './claude'

const logger = pino({ level: 'silent' })
const app = express()
app.use(express.json())

let sock: ReturnType<typeof makeWASocket> | null = null
let latestQR: string | null = null
const AUTH_FOLDER = 'auth_info'

async function saveDraft(phone: string, senderName: string, message: string, draft: string) {
  const db = getFirestore()
  await db.collection('messages').add({
    phone, senderName, body: message, direction: 'inbound', createdAt: new Date(),
  })
  await db.collection('drafts').add({
    phone, senderName, originalMessage: message, draft, status: 'pending', createdAt: new Date(),
  })
  console.log(`[✓] Rascunho guardado para ${phone} (${senderName})`)
}

async function getConversationHistory(phone: string): Promise<{ role: 'user' | 'assistant'; content: string }[]> {
  const db = getFirestore()
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const msgs = await db.collection('messages')
    .where('phone', '==', phone)
    .where('createdAt', '>=', cutoff)
    .orderBy('createdAt', 'asc')
    .limit(20)
    .get()
  return msgs.docs.map(doc => {
    const d = doc.data()
    return { role: d.direction === 'inbound' ? 'user' : 'assistant', content: d.body }
  })
}

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER)
  const { version } = await fetchLatestBaileysVersion()

  sock = makeWASocket({
    version, logger,
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
    printQRInTerminal: false,
    browser: ['TecniMoove Agent', 'Chrome', '120.0.0'],
  })

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update
    if (qr) {
      latestQR = qr
      console.log('📱 QR Code disponivel em: /qr')
    }
    if (connection === 'close') {
      latestQR = null
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
      console.log('Conexão fechada. Reconectar:', shouldReconnect)
      if (shouldReconnect) setTimeout(connectToWhatsApp, 5000)
      else console.log('Sessão terminada.')
    }
    if (connection === 'open') {
      latestQR = null
      console.log('✅ WhatsApp ligado com sucesso!')
    }
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    for (const msg of messages) {
      if (msg.key.fromMe) continue
      if (msg.key.remoteJid?.endsWith('@g.us')) continue
      const phone = msg.key.remoteJid || ''
      const body = msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption || ''
      if (!body.trim()) continue
      const senderName = msg.pushName || phone.replace('@s.whatsapp.net', '')
      console.log(`\n📩 Mensagem de ${senderName} (${phone}): ${body}`)
      try {
        const history = await getConversationHistory(phone)
        const draft = await generateDraft(body, history)
        console.log(`💬 Rascunho gerado: ${draft}`)
        await saveDraft(phone, senderName, body, draft)
      } catch (err) {
        console.error('Erro ao processar mensagem:', err)
      }
    }
  })
}

// ── QR Code como imagem ───────────────────────────────────────────────────────
app.get('/qr', (_, res) => {
  if (!latestQR) {
    return res.send(`
      <html><body style="font-family:sans-serif;text-align:center;padding:40px">
        <h2>${sock ? '✅ WhatsApp já está ligado!' : '⏳ A aguardar QR Code... recarrega a página.'}</h2>
        <p><a href="/qr">Recarregar</a> | <a href="/health">Estado</a></p>
      </body></html>
    `)
  }
  const encoded = encodeURIComponent(latestQR)
  res.send(`
    <html>
      <head><meta http-equiv="refresh" content="20">
      <style>body{font-family:sans-serif;text-align:center;padding:40px;background:#f0f0f0}</style></head>
      <body>
        <h2>📱 Liga o WhatsApp — TecniMoove</h2>
        <p>WhatsApp → Dispositivos Ligados → Ligar um dispositivo</p>
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encoded}"
             style="border:8px solid white;border-radius:8px;margin:20px auto;display:block"/>
        <p style="color:#888;font-size:14px">A página atualiza automaticamente a cada 20 segundos</p>
      </body>
    </html>
  `)
})

// ── Reset sessão WhatsApp ─────────────────────────────────────────────────────
app.get('/reset', (_, res) => {
  try {
    if (sock) { sock.end(undefined); sock = null }
    if (fs.existsSync(AUTH_FOLDER)) {
      fs.rmSync(AUTH_FOLDER, { recursive: true, force: true })
      console.log('🗑 Sessão apagada')
    }
    setTimeout(connectToWhatsApp, 2000)
    res.send(`
      <html><body style="font-family:sans-serif;text-align:center;padding:40px">
        <h2>🔄 Sessão resetada!</h2>
        <p>Aguarda 5 segundos e vai para o QR Code</p>
        <meta http-equiv="refresh" content="5;url=/qr">
      </body></html>
    `)
  } catch (err) {
    res.status(500).send('Erro ao resetar: ' + err)
  }
})

app.post('/send', async (req, res) => {
  const { phone, message, draftId } = req.body
  if (!sock) return res.status(503).json({ error: 'WhatsApp não está ligado' })
  try {
    await sock.sendMessage(phone, { text: message })
    const db = getFirestore()
    await db.collection('messages').add({ phone, body: message, direction: 'outbound', createdAt: new Date() })
    if (draftId) await db.collection('drafts').doc(draftId).update({ status: 'sent', sentAt: new Date() })
    console.log(`[✓] Mensagem enviada para ${phone}`)
    res.json({ ok: true })
  } catch (err) {
    console.error('Erro ao enviar:', err)
    res.status(500).json({ error: 'Erro ao enviar mensagem' })
  }
})

app.get('/health', (_, res) => res.json({ status: 'ok', connected: sock !== null, hasQR: latestQR !== null }))

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`🚀 Servidor a correr na porta ${PORT}`)
  connectToWhatsApp()
})
