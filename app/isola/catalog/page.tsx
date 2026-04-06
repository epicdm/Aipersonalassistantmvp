'use client'

import { useEffect, useState } from 'react'
import { useToken } from '../token-context'

interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  available: boolean
  imageUrl?: string
}

export default function CatalogPage() {
  const token = useToken()
  const [products, setProducts] = useState<Product[]>([])
  const [selected, setSelected] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', price: '', category: '', available: true })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!token) return
    fetch(`/api/dashboard/catalog?token=${token}`)
      .then(r => r.json())
      .then(d => { setProducts(d.products ?? []); if (d.products?.[0]) setSelected(d.products[0]) })
      .finally(() => setLoading(false))
  }, [token])

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/dashboard/catalog?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, price: parseFloat(form.price) || 0 }),
    })
    const d = await res.json()
    if (d.product) {
      setProducts(prev => [...prev, d.product])
      setSelected(d.product)
    }
    setShowNew(false)
    setForm({ name: '', description: '', price: '', category: '', available: true })
    setSaving(false)
  }

  async function toggleAvailable(p: Product) {
    const res = await fetch(`/api/dashboard/catalog/${p.id}?token=${token}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ available: !p.available }),
    })
    const d = await res.json()
    if (d.product) {
      setProducts(prev => prev.map(x => x.id === p.id ? d.product : x))
      setSelected(d.product)
    }
  }

  return (
    <>
      <div className="is-list-panel">
        <div className="is-panel-header">
          <div>
            <div className="is-panel-title">Catalog</div>
            <div className="is-panel-date">{products.length} products</div>
          </div>
          <button className="is-btn-green" onClick={() => { setShowNew(true); setSelected(null) }}>+ Add</button>
        </div>

        <div className="is-list">
          {loading && <div className="is-loading"><div className="is-spinner" /></div>}
          {!loading && products.length === 0 && (
            <div className="is-empty">
              <div className="is-empty-icon">📦</div>
              <div className="is-empty-text">No products yet</div>
            </div>
          )}
          {products.map(p => (
            <div key={p.id} className={`is-row${selected?.id === p.id ? ' active' : ''}`} onClick={() => { setSelected(p); setShowNew(false) }}>
              <div className="is-avatar-md" style={{ background: p.available ? '#3A9B1E' : '#667781', fontSize: 20 }}>📦</div>
              <div className="is-row-body">
                <div className="is-row-top">
                  <div className="is-row-name">{p.name}</div>
                  <div className="is-row-time">${p.price}</div>
                </div>
                <div className="is-row-preview">{p.category || 'Uncategorized'} · {p.available ? 'Available' : 'Hidden'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="is-main-panel">
        {showNew ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 520 }}>
            <div className="is-right-title">New Product</div>
            <div>
              <label className="is-label">Name</label>
              <input className="is-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Basic Internet Plan" />
            </div>
            <div>
              <label className="is-label">Description</label>
              <textarea className="is-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ resize: 'vertical' }} placeholder="What does it include?" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="is-label">Price ($)</label>
                <input className="is-input" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="49.00" type="number" />
              </div>
              <div>
                <label className="is-label">Category</label>
                <input className="is-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Internet" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button className="is-btn-green" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Add Product'}</button>
              <button className="is-btn-ghost" onClick={() => setShowNew(false)}>Cancel</button>
            </div>
          </div>
        ) : selected ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 520 }}>
            <div className="is-right-header" style={{ margin: '-24px -24px 0', padding: '14px 24px' }}>
              <div className="is-right-title">{selected.name}</div>
              <div className="is-right-sub">{selected.category || 'Uncategorized'}</div>
            </div>
            <div style={{ marginTop: 8 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div className="is-label">Price</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>${selected.price}</div>
              </div>
              <div>
                <div className="is-label">Status</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: selected.available ? 'var(--is-green)' : 'var(--is-muted)' }}>
                  {selected.available ? '● Available' : '○ Hidden'}
                </div>
              </div>
            </div>
            {selected.description && (
              <div>
                <div className="is-label">Description</div>
                <div style={{ fontSize: 13, color: 'var(--is-muted)' }}>{selected.description}</div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="is-btn-ghost" onClick={() => toggleAvailable(selected)}>
                {selected.available ? 'Hide from Agent' : 'Make Available'}
              </button>
            </div>
          </div>
        ) : (
          <div className="is-empty" style={{ marginTop: 60 }}>
            <div className="is-empty-icon">📦</div>
            <div className="is-empty-text">Select a product or add a new one</div>
          </div>
        )}
      </div>
    </>
  )
}
