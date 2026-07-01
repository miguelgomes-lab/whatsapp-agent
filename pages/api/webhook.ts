import type { NextApiRequest, NextApiResponse } from "next"
import { db } from "@/lib/firebase"
import { generateDraft } from "@/lib/claude"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") return res.status(200).json({ status: "ok" })
  if (req.method !== "POST") return res.status(405).end()

  try {
    const body = req.body

    // Evolution API payload
    const event = body.event
    if (event !== "messages.upsert") return res.status(200).json({ ok: true })

    const msg = body.data
    if (!msg) return res.status(200).json({ ok: true })

    // Ignorar mensagens enviadas por nós
    if (msg.key?.fromMe) return res.status(200).json({ ok: true })

    // Ignorar grupos
    const remoteJid = msg.key?.remoteJid || ""
    if (remoteJid.includes("@g.us")) return res.status(200).json({ ok: true })

    // Extrair texto
    const messageText = msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      ""

    if (!messageText) return res.status(200).json({ ok: true })

    // Número do remetente (formato: 351912345678@s.whatsapp.net)
    const phone = remoteJid.replace("@s.whatsapp.net", "")
    const senderName = msg.pushName || phone
    const messageId = msg.key?.id || crypto.randomUUID()
    const timestamp = new Date()

    await db.collection("messages").doc(messageId).set({
      phone, senderName, content: messageText, direction: "inbound", createdAt: timestamp,
    })

    const historySnap = await db.collection("messages")
      .where("phone", "==", phone)
      .orderBy("createdAt", "desc")
      .limit(11)
      .get()

    const conversationHistory = historySnap.docs
      .reverse()
      .filter(d => d.id !== messageId)
      .slice(-10)
      .map(d => ({
        role: (d.data().direction === "inbound" ? "user" : "assistant") as "user" | "assistant",
        content: d.data().content as string,
      }))

    const draft = await generateDraft(messageText, conversationHistory)

    await db.collection("drafts").add({
      phone, senderName, originalMessage: messageText,
      draftContent: draft, status: "pending", createdAt: timestamp,
    })

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error("Webhook error:", err)
    return res.status(500).json({ error: "Internal error" })
  }
}