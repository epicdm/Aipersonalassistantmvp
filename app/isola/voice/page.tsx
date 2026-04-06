'use client'

import { useEffect, useState } from 'react'
import { useToken } from '../token-context'

interface CallLog {
  id: string
  contactName: string
  contactPhone: string
  direction: string
  duration: number
  status: string
  summary?: string
  createdAt: string
}

interface VoiceData {
  did?: string
  stats: { today: number; avgDuration: string; aiHandled: string }
  calls: CallLog[]
}

function fmtDuration(s: number) {
  if (!s || !isFinite(s) || s <= 0) return '0s'
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

export default function VoicePage() {
  const token = useToken()
  const [data, setData] = useState<VoiceData | null>(null)
  const [selected, setSelected] = useState<CallLog | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    fetch(`/api/dashboard/voice?token=${token}`)
      .then(r => r.json())
      .then(d => { setData(d); if (d.calls?.[0]) setSelected(d.calls[0]) })
      .finally(() => setLoading(false))
  }, [token])

  return (
    <>
      <div className="is-list-panel">
        <div className="is-panel-header">
          <div>
            <div className="is-panel-title">Voice</div>
            <div className="is-panel-date">{data?.stats?.today ?? 0} calls today</div>
          </div>
        </div>

        <div style={{ padding: '12px 16px 8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ background: 'var(--is-panel)', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--is-muted)', textTransform: 'uppercase' }}>AI Handled</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{data?.stats?.aiHandled ?? '—'}</div>
          </div>
          <div style={{ background: 'var(--is-panel)', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--is-muted)', textTransform: 'uppercase' }}>Avg Duration</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{data?.stats?.avgDuration || '—'}</div>
          </div>
        </div>

        <div className="is-list">
          {loading && <div className="is-loading"><div className="is-spinner" /></div>}
          {!loading && (data?.calls?.length ?? 0) === 0 && (
            <div className="is-empty">
              <div className="is-empty-icon">🎙</div>
              <div className="is-empty-text">No calls yet</div>
            </div>
          )}
          {(data?.calls ?? []).map(c => (
            <div key={c.id} className={`is-row${selected?.id === c.id ? ' active' : ''}`} onClick={() => setSelected(c)}>
              <div className="is-avatar-md" style={{ background: '#075E54', fontSize: 20 }}>
                {c.direction === 'inbound' ? '📲' : '📞'}
              </div>
              <div className="is-row-body">
                <div className="is-row-top">
                  <div className="is-row-name">{c.contactName || c.contactPhone}</div>
                  <div className="is-row-time">{fmtDuration(c.duration)}</div>
                </div>
                <div className="is-row-preview" style={{ textTransform: 'capitalize' }}>
                  {c.direction} · {c.status} · {new Date(c.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="is-dot" style={{ background: c.status === 'answered' ? 'var(--is-green)' : 'var(--is-muted)' }} />
            </div>
          ))}
        </div>
      </div>

      <div className="is-main-panel">
        {selected ? (
          <div style={{ padding: 24, maxWidth: 520 }}>
            <div className="is-right-header" style={{ margin: '-24px -24px 16px', padding: '14px 24px' }}>
              <div className="is-right-title">{selected.contactName || selected.contactPhone}</div>
              <div className="is-right-sub">{selected.contactPhone}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div className="is-label">Direction</div>
                <div style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>{selected.direction}</div>
              </div>
              <div>
                <div className="is-label">Status</div>
                <div style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize', color: selected.status === 'answered' ? 'var(--is-green)' : 'var(--is-muted)' }}>{selected.status}</div>
              </div>
              <div>
                <div className="is-label">Duration</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{fmtDuration(selected.duration)}</div>
              </div>
              <div>
                <div className="is-label">Time</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{new Date(selected.createdAt).toLocaleString()}</div>
              </div>
            </div>

            {selected.summary && (
              <div style={{ marginTop: 16 }}>
                <div className="is-label">AI Summary</div>
                <div style={{ marginTop: 6, padding: '10px 14px', background: 'var(--is-panel)', borderRadius: 8, fontSize: 13, lineHeight: 1.6 }}>
                  {selected.summary}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="is-empty" style={{ marginTop: 60 }}>
            <div className="is-empty-icon">🎙</div>
            <div className="is-empty-text">Select a call to view details</div>
          </div>
        )}
      </div>
    </>
  )
}
