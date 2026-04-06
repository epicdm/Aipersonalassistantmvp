'use client'

import { useEffect, useState } from 'react'
import { useToken } from '../token-context'

interface FeedbackData {
  averageRating: number
  totalResponses: number
  distribution: Record<string, number>
  recent: Array<{ contactName: string; rating: number; createdAt: string; message?: string }>
}

const STARS: Record<number, string> = { 1: '😞', 2: '😕', 3: '😐', 4: '😊', 5: '🤩' }

export default function FeedbackPage() {
  const token = useToken()
  const [data, setData] = useState<FeedbackData | null>(null)
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (!token) return
    fetch(`/api/dashboard/feedback?token=${token}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [token])

  async function requestFeedback() {
    setRequesting(true)
    await fetch(`/api/dashboard/feedback/request?token=${token}`, { method: 'POST' })
    setRequesting(false)
    setSent(true)
    setTimeout(() => setSent(false), 4000)
  }

  if (loading) {
    return (
      <div className="is-full-panel" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="is-loading"><div className="is-spinner" /></div>
      </div>
    )
  }

  const avg = data?.averageRating ?? 0
  const dist = data?.distribution ?? {}

  return (
    <div className="is-full-panel" style={{ overflowY: 'auto' }}>
      <div className="is-right-header">
        <div className="is-right-title">Feedback</div>
        <div className="is-right-sub">{data?.totalResponses ?? 0} responses</div>
      </div>

      {/* Score card */}
      <div style={{ padding: '20px 20px 0', display: 'flex', gap: 16 }}>
        <div className="is-stat-card" style={{ flex: 1 }}>
          <div className="is-stat-bar" style={{ background: '#FFA722' }} />
          <div className="is-stat-label">Average Rating</div>
          <div className="is-stat-value">{avg > 0 ? avg.toFixed(1) : '—'}</div>
          <div className="is-stat-delta" style={{ color: '#FFA722' }}>
            {avg >= 4.5 ? '🤩 Excellent' : avg >= 3.5 ? '😊 Good' : avg >= 2.5 ? '😐 OK' : avg > 0 ? '😕 Needs work' : 'No data yet'}
          </div>
        </div>
        <div style={{ flex: 2 }}>
          {[5, 4, 3, 2, 1].map(n => {
            const count = dist[n] ?? 0
            const pct = data?.totalResponses ? Math.round((count / data.totalResponses) * 100) : 0
            return (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <span style={{ fontSize: 13, width: 20 }}>{STARS[n]}</span>
                <div style={{ flex: 1, height: 8, background: 'var(--is-border)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: 'var(--is-yellow)', borderRadius: 4 }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--is-muted)', width: 28 }}>{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ padding: '16px 20px 8px', display: 'flex', gap: 10 }}>
        <button className="is-btn-green" onClick={requestFeedback} disabled={requesting}>
          {requesting ? 'Sending…' : sent ? '✓ Sent to all contacts!' : '⭐ Request Feedback'}
        </button>
      </div>

      {(data?.recent?.length ?? 0) > 0 && (
        <>
          <div className="is-section-head" style={{ marginTop: 8 }}>Recent Responses</div>
          <div className="is-divider" />
          <div className="is-action-list" style={{ marginBottom: 20 }}>
            {data!.recent.map((r, i) => (
              <div key={i} className="is-action-row" style={{ cursor: 'default' }}>
                <div className="is-action-icon" style={{ background: 'var(--is-panel)', fontSize: 22 }}>
                  {STARS[r.rating] ?? '⭐'}
                </div>
                <div className="is-action-body">
                  <div className="is-action-label">{r.contactName}</div>
                  <div className="is-action-sub">
                    {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)} · {new Date(r.createdAt).toLocaleDateString()}
                  </div>
                  {r.message && <div style={{ fontSize: 11, color: 'var(--is-text)', marginTop: 3 }}>{r.message}</div>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {(data?.totalResponses ?? 0) === 0 && (
        <div className="is-empty" style={{ marginTop: 40 }}>
          <div className="is-empty-icon">⭐</div>
          <div className="is-empty-text">No feedback yet — request some!</div>
        </div>
      )}
    </div>
  )
}
