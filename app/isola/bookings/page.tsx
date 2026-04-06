'use client'

import { useEffect, useState } from 'react'
import { useToken } from '../token-context'

interface Booking {
  id: string
  contactName: string
  contactPhone: string
  serviceName: string
  datetime: string
  notes: string
  price: number
  status: string
  createdAt: string
}

const STATUS_COLOR: Record<string, string> = {
  confirmed: 'var(--is-green)',
  pending:   'var(--is-yellow)',
  cancelled: 'var(--is-red)',
  completed: 'var(--is-teal)',
}

export default function BookingsPage() {
  const token = useToken()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selected, setSelected] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [reminding, setReminding] = useState(false)
  const [reminded, setReminded] = useState(false)

  useEffect(() => {
    if (!token) return
    fetch(`/api/dashboard/bookings?token=${token}`)
      .then(r => r.json())
      .then(d => { setBookings(d.bookings ?? []); if (d.bookings?.[0]) setSelected(d.bookings[0]) })
      .finally(() => setLoading(false))
  }, [token])

  async function sendReminder() {
    if (!selected) return
    setReminding(true)
    await fetch(`/api/dashboard/bookings/${selected.id}/remind?token=${token}`, { method: 'POST' })
    setReminding(false)
    setReminded(true)
    setTimeout(() => setReminded(false), 3000)
  }

  return (
    <>
      <div className="is-list-panel">
        <div className="is-panel-header">
          <div>
            <div className="is-panel-title">Bookings</div>
            <div className="is-panel-date">{bookings.length} appointments</div>
          </div>
        </div>

        <div className="is-list">
          {loading && <div className="is-loading"><div className="is-spinner" /></div>}
          {!loading && bookings.length === 0 && (
            <div className="is-empty">
              <div className="is-empty-icon">📅</div>
              <div className="is-empty-text">No bookings yet</div>
              <div style={{ fontSize: 11, color: 'var(--is-muted)', marginTop: 4 }}>Customers book via WhatsApp</div>
            </div>
          )}
          {bookings.map(b => (
            <div key={b.id} className={`is-row${selected?.id === b.id ? ' active' : ''}`} onClick={() => setSelected(b)}>
              <div className="is-avatar-md" style={{ background: '#5B8DEF', fontSize: 20 }}>📅</div>
              <div className="is-row-body">
                <div className="is-row-top">
                  <div className="is-row-name">{b.contactName}</div>
                  <div className="is-row-time">{new Date(b.datetime).toLocaleDateString()}</div>
                </div>
                <div className="is-row-preview">{b.serviceName}</div>
              </div>
              <div className="is-dot" style={{ background: STATUS_COLOR[b.status] ?? 'var(--is-light)' }} />
            </div>
          ))}
        </div>
      </div>

      <div className="is-main-panel">
        {selected ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 520 }}>
            <div className="is-right-header" style={{ margin: '-24px -24px 0', padding: '14px 24px' }}>
              <div className="is-right-title">{selected.contactName}</div>
              <div className="is-right-sub">{selected.contactPhone}</div>
            </div>
            <div style={{ marginTop: 8 }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div className="is-label">Service</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{selected.serviceName}</div>
              </div>
              <div>
                <div className="is-label">Price</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>${selected.price}</div>
              </div>
              <div>
                <div className="is-label">Date & Time</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{new Date(selected.datetime).toLocaleString()}</div>
              </div>
              <div>
                <div className="is-label">Status</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: STATUS_COLOR[selected.status] ?? 'inherit', textTransform: 'capitalize' }}>{selected.status}</div>
              </div>
            </div>

            {selected.notes && (
              <div>
                <div className="is-label">Notes</div>
                <div style={{ fontSize: 13, color: 'var(--is-muted)' }}>{selected.notes}</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="is-btn-green" onClick={sendReminder} disabled={reminding}>
                {reminding ? 'Sending…' : reminded ? '✓ Sent!' : '📲 Send Reminder'}
              </button>
            </div>
          </div>
        ) : (
          <div className="is-empty" style={{ marginTop: 60 }}>
            <div className="is-empty-icon">📅</div>
            <div className="is-empty-text">Select a booking to view details</div>
          </div>
        )}
      </div>
    </>
  )
}
