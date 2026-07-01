import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { generateDraft } from '@/lib/claude'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (body.fromMe) return NextResponse.json({ ok: true })
    if (body.isGroup) return NextResponse.json({ ok: true })

    const messageText = body.text?.message || body.caption
    if (!messageText) return NextResponse.json({ ok: true })

    const phone = body.phone
    const senderName = body.senderName || phone
    const messageId = body.messageId || crypto.randomUUID()
    const timestamp = new Date()

    // Guardar mensagem recebida
    await db.collection('messages').doc(messageId).set({
      phone,
      senderName,
      content: messageText,
      direction: 'inbound',
      createdAt: timestamp,
    })

    // Buscar histórico recente (últimas 10 mensagens deste número)
    const historySnap = await db.collection('messages')
      .where('phone', '==', phone)
      .orderBy('createdAt', 'desc')
      .limit(11)
      .get()

    const conversationHistory = historySnap.docs
      .reverse()
      .filter(d => d.id !== messageId)
      .slice(-10)
      .map(d => ({
        role: (d.data().direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: d.data().content as string,
      }))

    // Gerar rascunho com Claude
    const draft = await generateDraft(messageText, conversationHistory)

    // Guardar rascunho
    await db.collection('drafts').add({
      phone,
      senderName,
      originalMessage: messageText,
      draftContent: draft,
      status: 'pending',
      createdAt: timestamp,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok' })
}
