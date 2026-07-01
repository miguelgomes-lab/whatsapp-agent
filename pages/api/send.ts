import type { NextApiRequest, NextApiResponse } from "next"
import { db } from "@/lib/firebase"
import { sendWhatsAppMessage } from "@/lib/zapi"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end()

  try {
    const { draftId, content } = req.body

    const draftRef = db.collection("drafts").doc(draftId)
    const draftSnap = await draftRef.get()
    if (!draftSnap.exists) return res.status(404).json({ error: "Draft not found" })

    const draft = draftSnap.data()!
    await sendWhatsAppMessage(draft.phone, content)

    await db.collection("messages").add({
      phone: draft.phone, senderName: "Miguel",
      content, direction: "outbound", createdAt: new Date(),
    })

    await draftRef.update({ status: "sent", finalContent: content, sentAt: new Date() })
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error("Send error:", err)
    return res.status(500).json({ error: "Failed to send" })
  }
}