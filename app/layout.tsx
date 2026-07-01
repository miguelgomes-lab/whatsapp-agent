import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'WhatsApp Agent — TecniMoove',
  description: 'Rascunhos de resposta WhatsApp',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body className="bg-gray-950 text-white min-h-screen">{children}</body>
    </html>
  )
}
