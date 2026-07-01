import { useEffect, useState, useCallback } from "react"

interface Draft {
  id: string
  phone: string
  senderName: string
  originalMessage: string
  draftContent: string
  status: string
  createdAt: string
}

export default function Dashboard() {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<string | null>(null)

  const fetchDrafts = useCallback(async () => {
    const res = await fetch("/api/drafts")
    const data = await res.json()
    setDrafts(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchDrafts()
    const interval = setInterval(fetchDrafts, 15000)
    return () => clearInterval(interval)
  }, [fetchDrafts])

  const handleSend = async (draft: Draft) => {
    setSending(draft.id)
    const content = editing[draft.id] ?? draft.draftContent
    try {
      await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId: draft.id, content }),
      })
      setDrafts(d => d.filter(x => x.id !== draft.id))
    } catch { alert("Erro ao enviar.") }
    setSending(null)
  }

  const handleDismiss = async (draftId: string) => {
    await fetch("/api/drafts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draftId, status: "dismissed" }),
    })
    setDrafts(d => d.filter(x => x.id !== draftId))
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const diffMin = Math.floor((Date.now() - d.getTime()) / 60000)
    if (diffMin < 1) return "agora mesmo"
    if (diffMin < 60) return `há ${diffMin} min`
    if (diffMin < 1440) return `há ${Math.floor(diffMin / 60)}h`
    return d.toLocaleDateString("pt-PT")
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 16px", fontFamily: "system-ui, sans-serif", background: "#0a0a0a", minHeight: "100vh", color: "white" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>WhatsApp Agent</h1>
          <p style={{ margin: "4px 0 0", color: "#888", fontSize: 13 }}>Rascunhos para aprovar</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {drafts.length > 0 && (
            <span style={{ background: "#16a34a", color: "white", borderRadius: 99, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>
              {drafts.length}
            </span>
          )}
          <button onClick={fetchDrafts} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 13 }}>↻ Atualizar</button>
        </div>
      </div>

      {loading && <p style={{ color: "#666", textAlign: "center", marginTop: 80 }}>A carregar...</p>}

      {!loading && drafts.length === 0 && (
        <div style={{ textAlign: "center", marginTop: 80 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <p style={{ color: "#888" }}>Nenhum rascunho pendente</p>
          <p style={{ color: "#555", fontSize: 13 }}>As novas mensagens aparecem aqui automaticamente</p>
        </div>
      )}

      {drafts.map(draft => (
        <div key={draft.id} style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 16, marginBottom: 16, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid #2a2a2a" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>
                {draft.senderName?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{draft.senderName}</p>
                <p style={{ margin: 0, color: "#666", fontSize: 12 }}>{draft.phone}</p>
              </div>
            </div>
            <span style={{ color: "#555", fontSize: 12 }}>{formatTime(draft.createdAt)}</span>
          </div>

          <div style={{ padding: "16px 20px" }}>
            <p style={{ margin: "0 0 8px", fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 1 }}>Mensagem recebida</p>
            <div style={{ background: "#1e1e1e", borderRadius: 10, padding: "10px 14px", color: "#ccc", fontSize: 14, lineHeight: 1.5, marginBottom: 16 }}>
              {draft.originalMessage}
            </div>

            <p style={{ margin: "0 0 8px", fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 1 }}>Rascunho IA</p>
            <textarea
              style={{ width: "100%", background: "#1e1e1e", border: "1px solid #333", borderRadius: 10, padding: "10px 14px", color: "white", fontSize: 14, lineHeight: 1.5, resize: "vertical", outline: "none", boxSizing: "border-box", minHeight: 80 }}
              value={editing[draft.id] ?? draft.draftContent}
              onChange={e => setEditing(prev => ({ ...prev, [draft.id]: e.target.value }))}
              rows={3}
            />

            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button
                onClick={() => handleSend(draft)}
                disabled={sending === draft.id}
                style={{ flex: 1, background: "#16a34a", color: "white", border: "none", borderRadius: 10, padding: "10px 0", fontWeight: 600, fontSize: 14, cursor: "pointer", opacity: sending === draft.id ? 0.6 : 1 }}
              >
                {sending === draft.id ? "A enviar..." : "✈ Enviar"}
              </button>
              <button
                onClick={() => handleDismiss(draft.id)}
                style={{ padding: "10px 16px", background: "none", color: "#888", border: "1px solid #333", borderRadius: 10, fontSize: 14, cursor: "pointer" }}
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}