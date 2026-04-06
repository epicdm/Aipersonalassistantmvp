'use client'

import { useEffect, useState } from 'react'
import { useToken } from '../token-context'

interface Campaign {
  id: string
  name: string
  status: string
  sentAt: string | null
  enrollmentCount: number
  deliveredCount: number
  readCount: number
}

export default function BroadcastsPage() {
  const token = useToken()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!token) return
    fetch(`/api/dashboard/broadcasts?token=${token}`)
      .then(r => r.json())
      .then(d => setCampaigns(d.campaigns ?? []))
      .finally(() => setLoading(false))
  }, [token])

  async function createBroadcast() {
    if (!name.trim() || !message.trim()) return
    setSaving(true)
    const res = await fetch(`/api/dashboard/broadcasts?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, message }),
    })
    const d = await res.json()
    if (d.campaign) setCampaigns(prev => [d.campaign, ...prev])
    setShowNew(false)
    setName('')
    setMessage('')
    setSaving(false)
  }

  return (
    <>
      <div className="is-list-panel">
        <div className="is-panel-header">
          <div>
            <div className="is-panel-title">Broadcasts</div>
            <div className="is-panel-date">{campaigns.length} campaigns</div>
          </div>
          <button className="is-btn-green" onClick={() => setShowNew(true)}>+ New</button>
        </div>

        <div className="is-list">
          {loading && <div className="is-loading"><div className="is-spinner" /></div>}
          {!loading && campaigns.length === 0 && (
            <div className="is-empty">
              <div className="is-empty-icon">📣</div>
              <div className="is-empty-text">No broadcasts yet</div>
            </div>
          )}
          {campaigns.map(c => (
            <div key={c.id} className="is-row">
              <div className="is-avatar-md" style={{ background: '#075E54', fontSize: 20 }}>📣</div>
              <div className="is-row-body">
                <div className="is-row-top">
                  <div className="is-row-name">{c.name}</div>
                  <div className="is-row-time">{c.sentAt ? new Date(c.sentAt).toLocaleDateString() : 'Draft'}</div>
                </div>
                <div className="is-row-preview">
                  {c.enrollmentCount} contacts · {c.deliveredCount} delivered · {c.readCount} read
                </div>
              </div>
              <div className="is-dot" style={{ background: c.status === 'completed' ? 'var(--is-green)' : c.status === 'running' ? 'var(--is-yellow)' : 'var(--is-light)' }} />
            </div>
          ))}
        </div>
      </div>

      <div className="is-main-panel">
        {showNew ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 520 }}>
            <div className="is-right-title">New Broadcast</div>
            <div>
              <label className="is-label">Campaign Name</label>
              <input className="is-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. April Promo" />
            </div>
            <div>
              <label className="is-label">Message</label>
              <textarea
                className="is-input"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Hi {{name}}, we have a special offer…"
                rows={5}
                style={{ resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="is-btn-green" onClick={createBroadcast} disabled={saving}>
                {saving ? 'Creating…' : 'Create & Schedule'}
              </button>
              <button className="is-btn-ghost" onClick={() => setShowNew(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="is-empty" style={{ marginTop: 60 }}>
            <div className="is-empty-icon">📣</div>
            <div className="is-empty-text">Select a campaign or create a new one</div>
            <button className="is-btn-green" style={{ marginTop: 12 }} onClick={() => setShowNew(true)}>+ New Broadcast</button>
          </div>
        )}
      </div>
    </>
  )
}
