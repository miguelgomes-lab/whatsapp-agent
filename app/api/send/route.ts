import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { sendWhatsAppMessage } from '@/lib/zapi'

export async function POST(req: NextRequest) {
  try {
    const { draftId, content } = await req.json()

    const draftRef = db.collection('drafts').doc(draftId)
    const draftSnap = await draftRef.get()

    if (!draftSnap.exists) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    const draft = draftSnap.data()!

    await sendWhatsAppMessage(draft.phone, content)

    // Guardar mensagem enviada no histórico
    await db.collection('messages').add({
      phone: draft.phone,
      senderName: 'Miguel',
      content,
      direction: 'outbound',
      createdAt: new Date(),
    })

    // Atualizar estado do rascunho
    await draftRef.update({
      status: 'sent',
      finalContent: content,
      sentAt: new Date(),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Send error:', err)
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }
}
