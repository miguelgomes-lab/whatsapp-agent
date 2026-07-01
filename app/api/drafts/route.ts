import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'

export async function GET() {
  const snap = await db.collection('drafts')
    .where('status', '==', 'pending')
    .orderBy('createdAt', 'desc')
    .get()

  const drafts = snap.docs.map(d => ({
    id: d.id,
    ...d.data(),
    createdAt: d.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  }))

  return NextResponse.json(drafts)
}

export async function PATCH(req: NextRequest) {
  const { draftId, status } = await req.json()

  await db.collection('drafts').doc(draftId).update({ status })

  return NextResponse.json({ ok: true })
}
