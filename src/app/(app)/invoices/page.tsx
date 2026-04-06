'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Invoice, InvoiceCategory, InvoiceStatus } from '@/types'
import Card from '@/components/ui/Card'
import StatusBadge from '@/components/ui/StatusBadge'
import CategoryBadge from '@/components/ui/CategoryBadge'
import AccountBadge from '@/components/ui/AccountBadge'
import Button from '@/components/ui/Button'
import {
  Plus, AlertTriangle, ChevronLeft, ChevronRight,
  Search, FileText, SlidersHorizontal, Check, X, Trash2,
} from 'lucide-react'

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'pending',  label: 'Pending'  },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'marketing',  label: 'Marketing'  },
  { value: 'office',     label: 'Office'     },
  { value: 'software',   label: 'Software'   },
  { value: 'inventory',  label: 'Inventory'  },
  { value: 'logistics',  label: 'Logistics'  },
  { value: 'other',      label: 'Other'      },
]

function fmt(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n)
}

export default function InvoicesPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(true)

  const [accountId, setAccountId]           = useState('')
  const [status, setStatus]                 = useState('')
  const [category, setCategory]             = useState('')
  const [month, setMonth]                   = useState('')
  const [duplicatesOnly, setDuplicatesOnly] = useState(false)
  const [search, setSearch]                 = useState('')

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  const limit = 20

  const load = useCallback(() => {
    setLoading(true)
    setSelected(new Set())
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() })
    if (accountId)      params.set('account_id', accountId)
    if (status)         params.set('status', status)
    if (category)       params.set('category', category)
    if (month)          params.set('month', month)
    if (duplicatesOnly) params.set('duplicates', 'true')

    fetch(`/api/invoices?${params}`)
      .then((r) => r.json())
      .then((d) => { setInvoices(d.invoices ?? []); setTotal(d.total ?? 0) })
      .finally(() => setLoading(false))
  }, [accountId, status, category, month, duplicatesOnly, page])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / limit)
  const filtered = search
    ? invoices.filter((inv) =>
        inv.vendor_name_raw?.toLowerCase().includes(search.toLowerCase()) ||
        inv.invoice_number?.toLowerCase().includes(search.toLowerCase())
      )
    : invoices

  // Selection helpers
  const allSelected = filtered.length > 0 && filtered.every(i => selected.has(i.id))
  const someSelected = selected.size > 0

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(i => i.id)))
    }
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function bulkAction(action: 'approve' | 'reject' | 'delete') {
    if (action === 'delete' && !confirm(`Delete ${selected.size} invoice(s)? This cannot be undone.`)) return
    setBulkLoading(true)
    await fetch('/api/invoices/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selected), action }),
    })
    setBulkLoading(false)
    load()
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <p style={overlineStyle}>Records</p>
          <h1 style={h1Style}>Invoices</h1>
        </div>
        <Button onClick={() => router.push('/upload')}>
          <Plus size={14} strokeWidth={2.5} /> New Invoice
        </Button>
      </div>

      {/* Filter bar */}
      <Card style={{ padding: '12px 16px', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              placeholder="Search vendor, #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ ...filterInput, paddingLeft: 30 }}
            />
          </div>

          <select value={status}   onChange={(e) => { setStatus(e.target.value);   setPage(1) }} style={filterInput}>{STATUSES.map((s)   => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
          <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1) }} style={filterInput}>{CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
          <input type="month" value={month} onChange={(e) => { setMonth(e.target.value); setPage(1) }} style={filterInput} />

          <button
            onClick={() => { setDuplicatesOnly((v) => !v); setPage(1) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 11px', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer',
              border: `1px solid ${duplicatesOnly ? '#FDE68A' : 'var(--border-2)'}`,
              background: duplicatesOnly ? '#FFFBEB' : 'var(--surface)',
              color: duplicatesOnly ? '#B45309' : 'var(--text-muted)',
            }}
          >
            <AlertTriangle size={12} /> Duplicates
          </button>

          {(accountId || status || category || month || duplicatesOnly || search) && (
            <button
              onClick={() => { setAccountId(''); setStatus(''); setCategory(''); setMonth(''); setDuplicatesOnly(false); setSearch(''); setPage(1) }}
              style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Clear filters
            </button>
          )}
        </div>
      </Card>

      {/* Bulk action bar */}
      {someSelected && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
          background: '#1C1917', borderRadius: 8, marginBottom: 10,
          color: '#fff',
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>
            {selected.size} selected
          </span>
          <button onClick={() => setSelected(new Set())} style={{ ...bulkBtn, color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <X size={12} /> Deselect
          </button>
          <button onClick={() => bulkAction('approve')} disabled={bulkLoading} style={{ ...bulkBtn, background: '#16A34A', color: '#fff', border: 'none' }}>
            <Check size={12} /> Approve
          </button>
          <button onClick={() => bulkAction('reject')} disabled={bulkLoading} style={{ ...bulkBtn, background: '#D97706', color: '#fff', border: 'none' }}>
            <X size={12} /> Reject
          </button>
          <button onClick={() => bulkAction('delete')} disabled={bulkLoading} style={{ ...bulkBtn, background: '#DC2626', color: '#fff', border: 'none' }}>
            <Trash2 size={12} /> Delete
          </button>
        </div>
      )}

      {/* Summary */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {loading ? 'Loading…' : `${total} invoice${total !== 1 ? 's' : ''} found`}
        </span>
      </div>

      {/* Invoice table */}
      <Card>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 64, textAlign: 'center' }}>
            <SlidersHorizontal size={28} color="var(--text-muted)" style={{ marginBottom: 10 }} />
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No invoices match your filters</div>
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ ...thStyle, width: 40, paddingRight: 0 }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  {['Vendor / #', 'Account', 'Date', 'Amount', 'Category', 'Status', ''].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv, idx) => (
                  <tr
                    key={inv.id}
                    style={{
                      borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                      background: selected.has(inv.id) ? '#F5F5F0' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => { if (!selected.has(inv.id)) e.currentTarget.style.background = '#FAFAF8' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = selected.has(inv.id) ? '#F5F5F0' : 'transparent' }}
                  >
                    <td style={{ ...tdStyle, width: 40, paddingRight: 0 }} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(inv.id)}
                        onChange={() => toggleOne(inv.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ ...tdStyle, maxWidth: 220, cursor: 'pointer' }} onClick={() => router.push(`/invoices/${inv.id}`)}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        {inv.is_duplicate && <AlertTriangle size={13} color="#D97706" style={{ marginTop: 2, flexShrink: 0 }} />}
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{inv.vendor_name_raw || '—'}</div>
                          {inv.invoice_number && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>#{inv.invoice_number}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, cursor: 'pointer' }} onClick={() => router.push(`/invoices/${inv.id}`)}>
                      {inv.account ? <AccountBadge name={inv.account.name} /> : '—'}
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap', cursor: 'pointer' }} onClick={() => router.push(`/invoices/${inv.id}`)}>
                      {new Date(inv.invoice_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td style={{ ...tdStyle, cursor: 'pointer' }} onClick={() => router.push(`/invoices/${inv.id}`)}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{fmt(inv.total_amount, inv.currency)}</div>
                      {inv.tax_amount > 0 && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tax: {fmt(inv.tax_amount, inv.currency)}</div>}
                    </td>
                    <td style={{ ...tdStyle, cursor: 'pointer' }} onClick={() => router.push(`/invoices/${inv.id}`)}>
                      <CategoryBadge category={inv.category as InvoiceCategory} />
                    </td>
                    <td style={{ ...tdStyle, cursor: 'pointer' }} onClick={() => router.push(`/invoices/${inv.id}`)}>
                      <StatusBadge status={inv.status as InvoiceStatus} />
                    </td>
                    <td style={{ ...tdStyle, width: 32, paddingLeft: 0, cursor: 'pointer' }} onClick={() => router.push(`/invoices/${inv.id}`)}>
                      <ChevronRight size={14} color="var(--text-muted)" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 20px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft size={13} /></Button>
                  <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight size={13} /></Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}

const overlineStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }
const h1Style: React.CSSProperties       = { fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }
const thStyle: React.CSSProperties       = { padding: '10px 18px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }
const tdStyle: React.CSSProperties       = { padding: '13px 18px', verticalAlign: 'middle' }
const filterInput: React.CSSProperties   = { background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 7, padding: '6px 10px', color: 'var(--text)', outline: 'none', fontSize: 13 }
const bulkBtn: React.CSSProperties       = { display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'transparent' }
