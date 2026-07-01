import type { NextApiRequest, NextApiResponse } from "next"
import { db } from "@/lib/firebase"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const snap = await db.collection("drafts")
      .where("status", "==", "pending")
      .orderBy("createdAt", "desc")
      .get()

    const drafts = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    }))
    return res.status(200).json(drafts)
  }

  if (req.method === "PATCH") {
    const { draftId, status } = req.body
    await db.collection("drafts").doc(draftId).update({ status })
    return res.status(200).json({ ok: true })
  }

  res.status(405).end()
}