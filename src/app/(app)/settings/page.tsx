'use client'

import { useEffect, useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Plus, Trash2, Building2 } from 'lucide-react'

interface Account { id: string; name: string }

export default function SettingsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [newName, setNewName]   = useState('')
  const [adding, setAdding]     = useState(false)
  const [error, setError]       = useState('')

  function load() {
    fetch('/api/accounts').then(r => r.json()).then(setAccounts)
  }

  useEffect(() => { load() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setAdding(true); setError('')
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    const data = await res.json()
    setAdding(false)
    if (!res.ok) { setError(data.error || 'Failed to create account'); return }
    setNewName('')
    load()
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete account "${name}"?`)) return
    const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { alert(data.error); return }
    load()
  }

  return (
    <div style={{ maxWidth: 560 }} className="fade-in">
      <div style={{ marginBottom: 28 }}>
        <p style={overline}>Settings</p>
        <h1 style={h1}>Accounts</h1>
      </div>

      {/* Existing accounts */}
      <Card style={{ marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ padding: '13px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <p style={sectionLabel}>Your Accounts</p>
        </div>

        {accounts.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No accounts yet.
          </div>
        ) : (
          accounts.map((acc, i) => (
            <div
              key={acc.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '13px 20px',
                borderBottom: i < accounts.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Building2 size={15} color="var(--text-muted)" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{acc.name}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{acc.id}</p>
              </div>
              <button
                onClick={() => handleDelete(acc.id, acc.name)}
                style={{ background: 'none', border: '1px solid var(--border-2)', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                title="Delete account"
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          ))
        )}
      </Card>

      {/* Add new account */}
      <Card style={{ overflow: 'hidden' }}>
        <div style={{ padding: '13px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <p style={sectionLabel}>Add New Account</p>
        </div>
        <form onSubmit={handleAdd} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={fieldLabel}>Account Name</label>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Acme Corp"
              style={inputStyle}
            />
          </div>
          {error && (
            <p style={{ fontSize: 12, color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '7px 11px' }}>
              {error}
            </p>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" disabled={adding || !newName.trim()}>
              <Plus size={13} /> {adding ? 'Adding…' : 'Add Account'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

const overline: React.CSSProperties    = { fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }
const h1: React.CSSProperties          = { fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }
const sectionLabel: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }
const fieldLabel: React.CSSProperties  = { fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }
const inputStyle: React.CSSProperties  = { width: '100%', border: '1px solid var(--border-2)', borderRadius: 7, padding: '8px 10px', color: 'var(--text)', outline: 'none', fontSize: 13 }
