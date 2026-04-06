'use client'

import { useState, useEffect, useRef } from 'react'

interface Convo {
  id: string; phone: string; contactName: string; status: string; channel: string
  lastMessagePreview: string; lastMessageAt: string; sessionType: string; escalationFlag: string | null
}
interface Message { id: string; role: string; content: string; timestamp: string; channel: string }

const AVATAR_COLORS = ['#5B8DEF','#E67E22','#8E44AD','#F15C6D','#075E54','#3A9B1E','#00A884','#FFA722']
const avatarColor = (n: string) => { let h = 0; for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) & 0xffffffff; return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length] }
const initials = (n: string) => n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
const timeAgo = (iso: string) => { const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000); if (m < 1) return 'now'; if (m < 60) return `${m}m`; const h = Math.floor(m / 60); return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d` }
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

export default function InboxClient({ convos: initial, token, agentId }: { convos: Convo[]; token: string; agentId: string }) {
  const [convos, setConvos] = useState(initial)
  const [selected, setSelected] = useState<Convo | null>(initial[0] ?? null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'pending'>('all')
  const [search, setSearch] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!selected) return
    setLoadingMsgs(true)
    fetch(`/api/dashboard/conversations/${selected.id}/messages?token=${token}`)
      .then(r => r.json())
      .then(d => setMessages(d.messages ?? []))
      .finally(() => setLoadingMsgs(false))
  }, [selected?.id])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const filtered = convos
    .filter(c => filter === 'all' || c.status === filter)
    .filter(c => c.contactName.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search) || c.lastMessagePreview.toLowerCase().includes(search.toLowerCase()))

  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <>
      <div className="is-list-panel">
        <div className="is-panel-header">
          <div>
            <div className="is-panel-title">Inbox</div>
            <div className="is-panel-date">{today}</div>
          </div>
          <div className="is-live-badge"><div className="is-live-dot" />Live</div>
        </div>

        <div style={{ display: 'flex', padding: '8px 12px 0', borderBottom: '1px solid var(--is-border)' }}>
          {(['all', 'active', 'pending'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ flex: 1, padding: '6px 0', fontSize: 11, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', color: filter === f ? 'var(--is-teal)' : 'var(--is-muted)', borderBottom: filter === f ? '2px solid var(--is-teal)' : '2px solid transparent', textTransform: 'capitalize' }}>
              {f}
            </button>
          ))}
        </div>

        <div className="is-search">
          <span>🔍</span>
          <input style={{ background: 'none', border: 'none', outline: 'none', fontSize: 12, flex: 1, color: 'var(--is-text)' }} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="is-list">
          {filtered.length === 0 && <div className="is-empty"><div className="is-empty-icon">💬</div><div className="is-empty-text">No conversations</div></div>}
          {filtered.map(c => (
            <div key={c.id} className={`is-row${selected?.id === c.id ? ' active' : ''}`} onClick={() => setSelected(c)}>
              <div className="is-avatar-md" style={{ background: avatarColor(c.contactName) }}>{initials(c.contactName)}</div>
              <div className="is-row-body">
                <div className="is-row-top">
                  <div className="is-row-name">{c.contactName}</div>
                  <div className="is-row-time">{timeAgo(c.lastMessageAt)}</div>
                </div>
                <div className="is-row-preview">{c.escalationFlag && <span style={{ color: 'var(--is-yellow)' }}>⚡ </span>}{c.lastMessagePreview || '—'}</div>
              </div>
              <div className="is-dot" style={{ background: c.escalationFlag ? 'var(--is-yellow)' : c.status === 'pending' ? 'var(--is-yellow)' : 'var(--is-green)' }} />
            </div>
          ))}
        </div>
      </div>

      <div className="is-main-panel" style={{ display: 'flex', flexDirection: 'column', padding: 0 }}>
        {selected ? (
          <>
            <div className="is-right-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="is-avatar-md" style={{ background: avatarColor(selected.contactName), flexShrink: 0 }}>{initials(selected.contactName)}</div>
              <div style={{ flex: 1 }}>
                <div className="is-right-title" style={{ fontSize: 15 }}>{selected.contactName}</div>
                <div className="is-right-sub">{selected.phone} · {selected.channel}</div>
              </div>
              <div style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: selected.status === 'active' ? '#D9FDD3' : 'var(--is-panel)', color: selected.status === 'active' ? 'var(--is-teal-dark)' : 'var(--is-muted)', textTransform: 'capitalize' }}>
                {selected.status}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', background: '#ECE5DD', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {loadingMsgs && <div className="is-loading"><div className="is-spinner" /></div>}
              {!loadingMsgs && messages.length === 0 && <div className="is-empty" style={{ background: 'transparent' }}><div className="is-empty-icon">💬</div><div className="is-empty-text">No messages yet</div></div>}
              {messages.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-start' : 'flex-end' }}>
                  <div style={{ maxWidth: '72%', background: m.role === 'user' ? '#fff' : '#D9FDD3', borderRadius: m.role === 'user' ? '8px 8px 8px 2px' : '8px 8px 2px 8px', padding: '8px 12px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.content}</div>
                    <div style={{ fontSize: 10, color: '#667781', marginTop: 4, textAlign: 'right' }}>
                      {fmtTime(m.timestamp)}{m.role !== 'user' && <span style={{ marginLeft: 4, color: '#53bdeb' }}>✓✓</span>}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div style={{ padding: '10px 16px', background: '#F0F2F5', borderTop: '1px solid var(--is-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, background: '#fff', borderRadius: 20, padding: '9px 14px', fontSize: 13, color: 'var(--is-muted)', border: '1px solid var(--is-border)' }}>
                Reply in <a href="https://inbox.epic.dm" target="_blank" rel="noreferrer" style={{ color: 'var(--is-teal)', fontWeight: 600, textDecoration: 'none' }}>Chatwoot ↗</a>
              </div>
            </div>
          </>
        ) : (
          <div className="is-empty" style={{ marginTop: 80 }}><div className="is-empty-icon">💬</div><div className="is-empty-text">Select a conversation</div></div>
        )}
      </div>
    </>
  )
}
