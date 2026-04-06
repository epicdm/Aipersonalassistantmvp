'use client'

interface AnalyticsData {
  convos: number; convosDelta: string
  messages: number; messagesDelta: string
  contacts: number; contactsDelta: string
  calls: number; callsDelta: string
  avgResponse: string; avgResponseDelta: string
  dailyConvos: Array<{ label: string; v: number }>
  sources: Array<{ label: string; pct: number }>
  topProducts: Array<{ name: string; mentions: number }>
}

export default function AnalyticsClient({ data }: { data: AnalyticsData }) {
  const maxDay = Math.max(...data.dailyConvos.map(d => d.v), 1)

  return (
    <div className="is-full-panel" style={{ overflowY: 'auto' }}>
      <div className="is-right-header">
        <div className="is-right-title">Analytics</div>
        <div className="is-right-sub">Last 30 days</div>
      </div>

      <div className="is-stats-grid">
        <div className="is-stat-card">
          <div className="is-stat-bar" style={{ background: '#075E54' }} />
          <div className="is-stat-label">Total Conversations</div>
          <div className="is-stat-value">{data.convos}</div>
          <div className="is-stat-delta" style={{ color: '#075E54' }}>{data.convosDelta}</div>
        </div>
        <div className="is-stat-card">
          <div className="is-stat-bar" style={{ background: '#3A9B1E' }} />
          <div className="is-stat-label">Messages</div>
          <div className="is-stat-value">{data.messages}</div>
          <div className="is-stat-delta" style={{ color: '#3A9B1E' }}>{data.messagesDelta}</div>
        </div>
        <div className="is-stat-card">
          <div className="is-stat-bar" style={{ background: '#00A884' }} />
          <div className="is-stat-label">Total Contacts</div>
          <div className="is-stat-value">{data.contacts}</div>
          <div className="is-stat-delta" style={{ color: '#00A884' }}>{data.contactsDelta}</div>
        </div>
        <div className="is-stat-card">
          <div className="is-stat-bar" style={{ background: '#5B8DEF' }} />
          <div className="is-stat-label">Voice Calls</div>
          <div className="is-stat-value">{data.calls}</div>
          <div className="is-stat-delta" style={{ color: '#5B8DEF' }}>avg {data.avgResponse}</div>
        </div>
      </div>

      <div className="is-section-head">Conversations — Last 7 Days</div>
      <div className="is-divider" />
      <div style={{ padding: '12px 20px 4px', display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
        {data.dailyConvos.map(d => (
          <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ width: '100%', height: `${Math.max(4, (d.v / maxDay) * 64)}px`, background: 'var(--is-teal)', borderRadius: 3, opacity: d.v === 0 ? 0.15 : 1 }} title={`${d.label}: ${d.v}`} />
            <div style={{ fontSize: 9, color: 'var(--is-muted)', whiteSpace: 'nowrap' }}>{d.label}</div>
          </div>
        ))}
      </div>

      <div className="is-section-head" style={{ marginTop: 12 }}>Traffic Sources</div>
      <div className="is-divider" />
      <div style={{ padding: '8px 20px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.sources.map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 80, fontSize: 12, fontWeight: 500 }}>{s.label}</div>
            <div style={{ flex: 1, height: 8, background: 'var(--is-border)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${s.pct}%`, height: '100%', background: 'var(--is-teal)', borderRadius: 4 }} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, width: 35, textAlign: 'right' }}>{s.pct}%</div>
          </div>
        ))}
      </div>
    </div>
  )
}
