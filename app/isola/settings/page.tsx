'use client'

import { useEffect, useState } from 'react'
import { useToken } from '../token-context'

interface ProfileData {
  agent: {
    name: string
    status: string
    phoneNumber?: string
    businessName?: string
    greeting?: string
  }
  hours: Record<string, { open: string; close: string; closed: boolean }>
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

export default function SettingsPage() {
  const token = useToken()
  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [hours, setHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>({})

  useEffect(() => {
    if (!token) return
    fetch(`/api/dashboard/profile?token=${token}`)
      .then(r => r.json())
      .then(d => {
        setData(d)
        setHours(d.hours ?? {})
      })
      .finally(() => setLoading(false))
  }, [token])

  function updateHour(day: string, field: string, val: string | boolean) {
    setHours(h => ({ ...h, [day]: { ...h[day], [field]: val } }))
  }

  async function save() {
    setSaving(true)
    await fetch(`/api/dashboard/profile?token=${token}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hours }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="is-full-panel" style={{ overflowY: 'auto' }}>
      <div className="is-right-header">
        <div className="is-right-title">Settings</div>
        <div className="is-right-sub">Business profile & hours</div>
      </div>

      {loading ? (
        <div className="is-loading"><div className="is-spinner" /></div>
      ) : (
        <div style={{ padding: '16px 20px 32px', display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 560 }}>

          {/* Business info (read-only) */}
          <div>
            <div className="is-section-head" style={{ padding: '0 0 8px' }}>Business Info</div>
            <div className="is-divider" style={{ margin: '0 0 12px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div className="is-label">Business Name</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{data?.agent?.businessName || data?.agent?.name || '—'}</div>
              </div>
              <div>
                <div className="is-label">WhatsApp Number</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{data?.agent?.phoneNumber || '—'}</div>
              </div>
            </div>
          </div>

          {/* Business hours */}
          <div>
            <div className="is-section-head" style={{ padding: '0 0 8px' }}>Business Hours</div>
            <div className="is-divider" style={{ margin: '0 0 12px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DAYS.map(day => {
                const h = hours[day] ?? { open: '08:00', close: '17:00', closed: false }
                return (
                  <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 90, fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{day}</div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={!h.closed}
                        onChange={e => updateHour(day, 'closed', !e.target.checked)}
                        style={{ accentColor: 'var(--is-teal)' }}
                      />
                      <span style={{ fontSize: 11, color: 'var(--is-muted)' }}>Open</span>
                    </label>
                    {!h.closed ? (
                      <>
                        <input
                          type="time"
                          value={h.open}
                          onChange={e => updateHour(day, 'open', e.target.value)}
                          className="is-input"
                          style={{ width: 100 }}
                        />
                        <span style={{ fontSize: 12, color: 'var(--is-muted)' }}>—</span>
                        <input
                          type="time"
                          value={h.close}
                          onChange={e => updateHour(day, 'close', e.target.value)}
                          className="is-input"
                          style={{ width: 100 }}
                        />
                      </>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--is-muted)' }}>Closed</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="is-btn-green" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
