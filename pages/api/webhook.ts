import type { NextApiRequest, NextApiResponse } from "next"
import { db } from "@/lib/firebase"
import { generateDraft } from "@/lib/claude"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") return res.status(200).json({ status: "ok" })
  if (req.method !== "POST") return res.status(405).end()

  try {
    const body = req.body
    if (body.fromMe || body.isGroup) return res.status(200).json({ ok: true })

    const messageText = body.text?.message || body.caption
    if (!messageText) return res.status(200).json({ ok: true })

    const phone = body.phone
    const senderName = body.senderName || phone
    const messageId = body.messageId || crypto.randomUUID()
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