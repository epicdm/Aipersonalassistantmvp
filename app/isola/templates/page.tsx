'use client'

import { useEffect, useState } from 'react'
import { useToken } from '../token-context'

interface Template {
  id: string
  name: string
  category: string
  language: string
  status: string
  components: Array<{ type: string; text?: string }>
}

interface TemplatesData {
  templates: Template[]
  total: number
}

export default function TemplatesPage() {
  const token = useToken()
  const [data, setData] = useState<TemplatesData | null>(null)
  const [selected, setSelected] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    fetch(`/api/dashboard/templates?token=${token}`)
      .then(r => r.json())
      .then(d => { setData(d); if (d.templates?.[0]) setSelected(d.templates[0]) })
      .finally(() => setLoading(false))
  }, [token])

  const STATUS_COLOR: Record<string, string> = {
    APPROVED: 'var(--is-green)',
    PENDING: 'var(--is-yellow)',
    REJECTED: 'var(--is-red)',
  }

  const body = selected?.components?.find(c => c.type === 'BODY')?.text ?? ''
  const header = selected?.components?.find(c => c.type === 'HEADER')?.text

  return (
    <>
      <div className="is-list-panel">
        <div className="is-panel-header">
          <div>
            <div className="is-panel-title">Templates</div>
            <div className="is-panel-date">{data?.total ?? 0} approved</div>
          </div>
        </div>

        <div className="is-list">
          {loading && <div className="is-loading"><div className="is-spinner" /></div>}
          {!loading && (data?.templates?.length ?? 0) === 0 && (
            <div className="is-empty">
              <div className="is-empty-icon">💌</div>
              <div className="is-empty-text">No templates found</div>
              <div style={{ fontSize: 11, color: 'var(--is-muted)', marginTop: 4 }}>
                Create templates in Meta Business Manager
              </div>
            </div>
          )}
          {(data?.templates ?? []).map(t => (
            <div key={t.id} className={`is-row${selected?.id === t.id ? ' active' : ''}`} onClick={() => setSelected(t)}>
              <div className="is-avatar-md" style={{ background: t.status === 'APPROVED' ? '#3A9B1E' : '#667781', fontSize: 20 }}>💌</div>
              <div className="is-row-body">
                <div className="is-row-top">
                  <div className="is-row-name">{t.name}</div>
                  <div className="is-row-time" style={{ color: STATUS_COLOR[t.status] ?? 'inherit', fontSize: 10, fontWeight: 600 }}>{t.status}</div>
                </div>
                <div className="is-row-preview">{t.category} · {t.language}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="is-main-panel">
        {selected ? (
          <div style={{ padding: 24, maxWidth: 520 }}>
            <div className="is-right-header" style={{ margin: '-24px -24px 16px', padding: '14px 24px' }}>
              <div className="is-right-title">{selected.name}</div>
              <div className="is-right-sub">{selected.category} · {selected.language}</div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <span style={{ padding: '3px 10px', borderRadius: 12, background: 'var(--is-panel)', fontSize: 11, fontWeight: 600, color: STATUS_COLOR[selected.status] ?? 'inherit' }}>
                {selected.status}
              </span>
            </div>

            {/* WhatsApp bubble preview */}
            <div style={{ background: '#ECE5DD', borderRadius: 12, padding: 16 }}>
              <div style={{ background: '#fff', borderRadius: '8px 8px 8px 2px', padding: '10px 14px', maxWidth: '85%', boxShadow: '0 1px 2px rgba(0,0,0,0.12)' }}>
                {header && <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{header}</div>}
                <div style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{body || '(no body text)'}</div>
                <div style={{ fontSize: 11, color: '#667781', marginTop: 6, textAlign: 'right' }}>
                  10:30 AM <span className="is-tick green" style={{ fontSize: 11 }}>✓✓</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="is-empty" style={{ marginTop: 60 }}>
            <div className="is-empty-icon">💌</div>
            <div className="is-empty-text">Select a template to preview</div>
          </div>
        )}
      </div>
    </>
  )
}
