'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Props {
  agent: { name: string; status: string }
  stats: { totalConvos: number; todayConvos: number; pendingCount: number; contactCount: number; callCount: number; todayCallCount: number }
  convos: Array<{ id: string; contactName: string; contactPhone: string; lastMessage: string; lastMessageAt: string; status: string; unread: number }>
  token: string
}

const AVATAR_COLORS = ['#5B8DEF','#E67E22','#8E44AD','#F15C6D','#075E54','#3A9B1E','#FFA722','#00A884']
function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}
function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export default function HomeClient({ agent, stats, convos, token }: Props) {
  const [selected, setSelected] = useState(0)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const t = (path: string) => `${path}?token=${token}`

  return (
    <>
      {/* ── CENTER PANEL ── */}
      <div className="is-list-panel">
        <div className="is-panel-header">
          <div>
            <div className="is-panel-title">Activity</div>
            <div className="is-panel-date">{today}</div>
          </div>
          <div className="is-live-badge"><div className="is-live-dot" />Live</div>
        </div>

        <div className="is-search">🔍 Search activity...</div>
        <div className="is-section-label">Today</div>

        <div className="is-list">
          {convos.length === 0 && (
            <div className="is-empty">
              <div className="is-empty-icon">💬</div>
              <div className="is-empty-text">No conversations yet today</div>
            </div>
          )}
          {convos.map((c, i) => (
            <div key={c.id} className={`is-row${selected === i ? ' active' : ''}`} onClick={() => setSelected(i)}>
              <div className="is-avatar-md" style={{ background: avatarColor(c.contactName) }}>{initials(c.contactName)}</div>
              <div className="is-row-body">
                <div className="is-row-top">
                  <div className="is-row-name">{c.contactName}</div>
                  <div className="is-row-time">{timeAgo(c.lastMessageAt)}</div>
                </div>
                <div className="is-row-preview"><span className="is-tick green">✓✓</span>{c.lastMessage}</div>
              </div>
              <div>
                {c.unread > 0
                  ? <div className="is-badge">{c.unread}</div>
                  : <div className="is-dot" style={{ background: c.status === 'pending' ? 'var(--is-yellow)' : 'var(--is-green)' }} />}
              </div>
            </div>
          ))}
          {convos.length > 0 && (
            <>
              <div className="is-section-label" style={{ marginTop: 8 }}>System</div>
              <div className="is-row">
                <div className="is-avatar-md" style={{ background: '#075E54', fontSize: 20 }}>🤖</div>
                <div className="is-row-body">
                  <div className="is-row-top">
                    <div className="is-row-name">{agent.name} (AI Agent)</div>
                    <div className="is-row-time">now</div>
                  </div>
                  <div className="is-row-preview"><span className="is-tick green">✓✓</span>{stats.todayConvos} responses today</div>
                </div>
                <div className="is-dot" style={{ background: 'var(--is-green)' }} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="is-main-panel">
        <div className="is-right-header">
          <div className="is-right-title">{greeting}, EPIC 👋</div>
          <div className="is-right-sub">Here's how {agent.name} did today</div>
        </div>

        <div className="is-stats-grid">
          <div className="is-stat-card">
            <div className="is-stat-bar" style={{ background: '#075E54' }} />
            <div className="is-stat-label">Convos Handled</div>
            <div className="is-stat-value">{stats.totalConvos}</div>
            <div className="is-stat-delta" style={{ color: '#075E54' }}>+{stats.todayConvos} today ↑</div>
          </div>
          <div className="is-stat-card">
            <div className="is-stat-bar" style={{ background: '#3A9B1E' }} />
            <div className="is-stat-label">Total Contacts</div>
            <div className="is-stat-value">{stats.contactCount}</div>
            <div className="is-stat-delta" style={{ color: '#3A9B1E' }}>in your network</div>
          </div>
          <div className="is-stat-card">
            <div className="is-stat-bar" style={{ background: '#00A884' }} />
            <div className="is-stat-label">Voice Calls</div>
            <div className="is-stat-value">{stats.callCount}</div>
            <div className="is-stat-delta" style={{ color: '#00A884' }}>+{stats.todayCallCount} today</div>
          </div>
          <div className="is-stat-card">
            <div className="is-stat-bar" style={{ background: '#FFA722' }} />
            <div className="is-stat-label">Need Attention</div>
            <div className="is-stat-value">{stats.pendingCount}</div>
            <div className="is-stat-delta" style={{ color: '#FFA722' }}>require your reply</div>
          </div>
        </div>

        <div className="is-section-head">Quick Actions</div>
        <div className="is-divider" />
        <div className="is-action-list">
          <Link href={t('/isola/broadcasts')} className="is-action-row">
            <div className="is-action-icon" style={{ background: '#075E54' }}>📣</div>
            <div className="is-action-body"><div className="is-action-label">Send Broadcast</div><div className="is-action-sub">Message all contacts at once</div></div>
            <div className="is-action-chevron">›</div>
          </Link>
          <Link href={t('/isola/catalog')} className="is-action-row">
            <div className="is-action-icon" style={{ background: '#3A9B1E' }}>📦</div>
            <div className="is-action-body"><div className="is-action-label">Update Catalog</div><div className="is-action-sub">Add or edit your products</div></div>
            <div className="is-action-chevron">›</div>
          </Link>
          <Link href={t('/isola/bookings')} className="is-action-row">
            <div className="is-action-icon" style={{ background: '#5B8DEF' }}>📅</div>
            <div className="is-action-body"><div className="is-action-label">View Bookings</div><div className="is-action-sub">{stats.pendingCount} pending today</div></div>
            <div className="is-action-chevron">›</div>
          </Link>
          <Link href={t('/isola/inbox')} className="is-action-row">
            <div className="is-action-icon" style={{ background: '#8E44AD' }}>💬</div>
            <div className="is-action-body"><div className="is-action-label">Open Inbox</div><div className="is-action-sub">View all conversations</div></div>
            <div className="is-action-chevron">›</div>
          </Link>
        </div>

        <div className="is-agent-card">
          <div className="is-agent-avatar">🤖<div className="is-agent-online" /></div>
          <div style={{ flex: 1 }}>
            <div className="is-agent-name">{agent.name}</div>
            <div className="is-agent-sub">AI Agent · Auto-pilot mode</div>
            <div className="is-agent-tick">✓✓ Handling conversations 24/7</div>
          </div>
          <Link href={t('/isola/agent')} className="is-pause-btn">Manage →</Link>
        </div>

        <div className="is-tip-bar">
          💡 <strong>Tip:</strong> {agent.name} automatically handles product questions, bookings, and payments.
          Go to <strong>Agent</strong> to update her instructions or add new capabilities.
        </div>
      </div>
    </>
  )
}
