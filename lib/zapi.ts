const ZAPI_BASE = `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}`

export async function sendWhatsAppMessage(phone: string, message: string) {
  const res = await fetch(`${ZAPI_BASE}/send-text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Client-Token': process.env.ZAPI_CLIENT_TOKEN!
    },
    body: JSON.stringify({ phone, message })
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Z-API error: ${err}`)
  }

  return res.json()
}
