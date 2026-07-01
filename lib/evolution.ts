const EVOLUTION_URL = process.env.EVOLUTION_API_URL!
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY!
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE_NAME!

export async function sendWhatsAppMessage(phone: string, message: string) {
  const res = await fetch(`${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": EVOLUTION_KEY,
    },
    body: JSON.stringify({
      number: phone,
      text: message,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Evolution API error: ${err}`)
  }

  return res.json()
}