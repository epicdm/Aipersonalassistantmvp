'use client'

import { useEffect, useState } from 'react'
import { useToken } from '../token-context'

interface AgentConfig {
  name: string
  status: string
  systemPrompt?: string
  greeting?: string
  tools?: string[]
}

export default function AgentPage() {
  const token = useToken()
  const [config, setConfig] = useState<AgentConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    if (!token) return
    fetch(`/api/dashboard/profile?token=${token}`)
      .then(r => r.json())
      .then(d => {
        setConfig(d.agent)
        setPrompt(d.agent?.systemPrompt ?? '')
        setGreeting(d.agent?.greeting ?? '')
      })
      .finally(() => setLoading(false))
  }, [token])

  async function save() {
    setSaving(true)
    await fetch(`/api/dashboard/profile?token=${token}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemPrompt: prompt, greeting }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const tools = config?.tools ?? []

  return (
    <div className="is-full-panel" style={{ overflowY: 'auto' }}>
      <div className="is-right-header">
        <div className="is-right-title">AI Agent</div>
        <div className="is-right-sub">Configure {config?.name ?? 'Aria'}</div>
      </div>

      {/* Agent status card */}
      <div className="is-agent-card" style={{ margin: '16px 20px 12px' }}>
        <div className="is-agent-avatar">
          🤖
          <div className="is-agent-online" />
        </div>
        <div style={{ flex: 1 }}>
          <div className="is-agent-name">{config?.name ?? 'Aria'}</div>
          <div className="is-agent-sub">AI Agent · {config?.status ?? 'active'}</div>
          <div className="is-agent-tick">✓✓ Handling conversations 24/7</div>
        </div>
        <div style={{
          padding: '3px 10px', borderRadius: 12,
          background: config?.status === 'active' ? '#D9FDD3' : 'rgba(255,255,255,0.1)',
          fontSize: 11, fontWeight: 600,
          color: config?.status === 'active' ? 'var(--is-teal-dark)' : '#E9EDEF',
        }}>
          {config?.status === 'active' ? '● Online' : '○ Paused'}
        </div>
      </div>

      {loading ? (
        <div className="is-loading"><div className="is-spinner" /></div>
      ) : (
        <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 640 }}>

          <div>
            <label className="is-label">Greeting Message</label>
            <div style={{ fontSize: 11, color: 'var(--is-muted)', marginBottom: 6 }}>
              First message Aria sends to new contacts
            </div>
            <textarea
              className="is-input"
              value={greeting}
              onChange={e => setGreeting(e.target.value)}
              rows={3}
              style={{ resize: 'vertical' }}
              placeholder="Hi! I'm Aria, EPIC's virtual assistant. How can I help you today?"
            />
          </div>

          <div>
            <label className="is-label">System Prompt</label>
            <div style={{ fontSize: 11, color: 'var(--is-muted)', marginBottom: 6 }}>
              Instructions that define Aria's behavior and knowledge
            </div>
            <textarea
              className="is-input"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={10}
              style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
              placeholder="You are Aria, a helpful AI assistant for EPIC Communications..."
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="is-btn-green" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Changes'}
            </button>
          </div>

          {tools.length > 0 && (
            <>
              <div style={{ borderTop: '1px solid var(--is-border)', paddingTop: 16 }}>
                <div className="is-label" style={{ marginBottom: 8 }}>Active Tools ({tools.length})</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {tools.map(t => (
                    <span key={t} style={{
                      padding: '4px 10px', borderRadius: 12,
                      background: 'var(--is-panel)', fontSize: 11, fontWeight: 500,
                      color: 'var(--is-text)', border: '1px solid var(--is-border)',
                    }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
