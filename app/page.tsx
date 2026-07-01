'use client'

import { useEffect, useState, useCallback } from 'react'

interface Draft {
  id: string
  phone: string
  sender_name: string
  original_message: string
  draft_content: string
  status: string
  created_at: string
}

export default function Dashboard() {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<string | null>(null)

  const fetchDrafts = useCallback(async () => {
    const res = await fetch('/api/drafts')
    const data = await res.json()
    setDrafts(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchDrafts()
    const interval = setInterval(fetchDrafts, 15000) // refresh a cada 15s
    return () => clearInterval(interval)
  }, [fetchDrafts])

  const handleSend = async (draft: Draft) => {
    setSending(draft.id)
    const content = editing[draft.id] ?? draft.draft_content
    try {
      await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId: draft.id, content })
      })
      setDrafts(d => d.filter(x => x.id !== draft.id))
    } catch {
      alert('Erro ao enviar. Tenta novamente.')
    }
    setSending(null)
  }

  const handleDismiss = async (draftId: string) => {
    await fetch('/api/drafts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draftId, status: 'dismissed' })
    })
    setDrafts(d => d.filter(x => x.id !== draftId))
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000)
    if (diffMin < 1) return 'agora mesmo'
    if (diffMin < 60) return `há ${diffMin} min`
    if (diffMin < 1440) return `há ${Math.floor(diffMin / 60)}h`
    return d.toLocaleDateString('pt-PT')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">WhatsApp Agent</h1>
          <p className="text-gray-400 text-sm mt-1">Rascunhos para aprovar</p>
        </div>
        <div className="flex items-center gap-2">
          {drafts.length > 0 && (
            <span className="bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {drafts.length}
            </span>
          )}
          <button
            onClick={fetchDrafts}
            className="text-gray-400 hover:text-white transition text-sm"
          >
            ↻ Atualizar
          </button>
        </div>
      </div>

      {/* Estado vazio */}
      {!loading && drafts.length === 0 && (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">✅</div>
          <p className="text-gray-400">Nenhum rascunho pendente</p>
          <p className="text-gray-600 text-sm mt-1">As novas mensagens aparecem aqui automaticamente</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-20 text-gray-500">A carregar...</div>
      )}

      {/* Lista de rascunhos */}
      <div className="space-y-4">
        {drafts.map(draft => (
          <div key={draft.id} className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center text-sm font-bold">
                  {draft.sender_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{draft.sender_name}</p>
                  <p className="text-gray-500 text-xs">{draft.phone}</p>
                </div>
              </div>
              <span className="text-gray-600 text-xs">{formatTime(draft.created_at)}</span>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Mensagem recebida */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Mensagem recebida</p>
                <div className="bg-gray-800 rounded-xl px-4 py-3 text-gray-300 text-sm leading-relaxed">
                  {draft.original_message}
                </div>
              </div>

              {/* Rascunho gerado */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                  Rascunho IA — edita se precisares
                </p>
                <textarea
                  className="w-full bg-gray-800 border border-gray-700 focus:border-green-500 rounded-xl px-4 py-3 text-white text-sm leading-relaxed resize-none outline-none transition min-h-[80px]"
                  value={editing[draft.id] ?? draft.draft_content}
                  onChange={e =>
                    setEditing(prev => ({ ...prev, [draft.id]: e.target.value }))
                  }
                  rows={3}
                />
              </div>

              {/* Ações */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleSend(draft)}
                  disabled={sending === draft.id}
                  className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition"
                >
                  {sending === draft.id ? 'A enviar...' : '✈ Enviar'}
                </button>
                <button
                  onClick={() => handleDismiss(draft.id)}
                  className="px-4 py-2.5 text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 rounded-xl text-sm transition"
                >
                  Descartar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
