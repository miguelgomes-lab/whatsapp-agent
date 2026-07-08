import 'dotenv/config'
import express from 'express'
import {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import qrcode from 'qrcode-terminal'
import pino from 'pino'
import { getFirestore } from './firebase'
import { generateDraft } from './claude'

const logger = pino({ level: 'silent' })
const app = express()
app.use(express.json())

let sock: ReturnType<typeof makeWASocket> | null = null

async function saveDraft(phone: string, senderName: string, message: string, draft: string) {
  const db = getFirestore()
  await db.collection('messages').add({
    phone,
    senderName,
    body: message,
    direction: 'inbound',
    createdAt: new Date(),
  })
  await db.collection('drafts').add({
    phone,
    senderName,
    originalMessage: message,
    draft,
    status: 'pending',
    createdAt: new Date(),
  })
  console.log(`[✓] Rascunho guardado para ${phone} (${senderName})`)
}

async function getConversationHistory(phone: string): Promise<{ role: 'user' | 'assistant'; content: string }[]> {
  const db = getFirestore()
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const msgs = await db
    .collection('messages')
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
  const { state, saveCreds } = await useMultiFileAuthState('auth_info')
  const { version } = await fetchLatestBaileysVersion()

  sock = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal: false,
    browser: ['TecniMoove Agent', 'Chrome', '120.0.0'],
  })

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update
    if (qr) {
      console.log('\n📱 Lê o QR Code abaixo com o teu WhatsApp:\n')
      qrcode.generate(qr, { small: true })
    }
    if (connection === 'close') {
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
      console.log('Conexão fechada. Reconectar:', shouldReconnect)
      if (shouldReconnect) setTimeout(connectToWhatsApp, 5000)
      else console.log('Sessão terminada. Apaga a pasta auth_info e reinicia.')
    }
    if (connection === 'open') console.log('✅ WhatsApp ligado com sucesso!')
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    for (const msg of messages) {
      if (msg.key.fromMe) continue
      if (msg.key.remoteJid?.endsWith('@g.us')) continue
      const phone = msg.key.remoteJid || ''
      const body =
        msg.message?.conversation ||
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

app.post('/send', async (req, res) => {
  const { phone, message, draftId } = req.body
  if (!sock) return res.status(503).json({ error: 'WhatsApp não está ligado' })
  try {
    await sock.sendMessage(phone, { text: message })
    const db = getFirestore()
    await db.collection('messages').add({
      phone, body: message, direction: 'outbound', createdAt: new Date(),
    })
    if (draftId) {
      await db.collection('drafts').doc(draftId).update({ status: 'sent', sentAt: new Date() })
    }
    console.log(`[✓] Mensagem enviada para ${phone}`)
    res.json({ ok: true })
  } catch (err) {
    console.error('Erro ao enviar:', err)
    res.status(500).json({ error: 'Erro ao enviar mensagem' })
  }
})

app.get('/health', (_, res) => res.json({ status: 'ok', connected: sock !== null }))

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`🚀 Servidor a correr na porta ${PORT}`)
  connectToWhatsApp()
})
