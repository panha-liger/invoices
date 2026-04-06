'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ExtractionResult, InvoiceCategory } from '@/types'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import {
  Upload, FileText, CheckCircle, AlertTriangle,
  Loader, X, ChevronRight, Plus, Trash2,
} from 'lucide-react'

const CATEGORIES: InvoiceCategory[] = ['marketing','office','software','inventory','logistics','other']

type FileStatus = 'queued' | 'uploading' | 'extracted' | 'saved' | 'error'

interface FileItem {
  id: string
  file: File
  status: FileStatus
  error?: string
  invoiceId?: string
  form?: Partial<ExtractionResult>
  isDuplicate?: boolean
  duplicateOf?: string | null
  confidence?: number
}

export default function UploadPage() {
  const router       = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [accounts, setAccounts]   = useState<{ id: string; name: string }[]>([])
  const [accountId, setAccountId] = useState('')
  const [items, setItems]         = useState<FileItem[]>([])
  const [dragOver, setDragOver]   = useState(false)
  const [running, setRunning]     = useState(false)
  const [activeReview, setActiveReview] = useState<string | null>(null) // file item id

  useEffect(() => {
    fetch('/api/accounts').then(r => r.json()).then(setAccounts)
  }, [])

  // ── Add files ──
  function addFiles(files: File[]) {
    const valid = files.filter(f =>
      f.type === 'application/pdf' || f.type.startsWith('image/')
    )
    const newItems: FileItem[] = valid.map(f => ({
      id: crypto.randomUUID(),
      file: f,
      status: 'queued',
    }))
    setItems(prev => [...prev, ...newItems])
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    addFiles(Array.from(e.dataTransfer.files))
  }, [])

  function removeItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    if (activeReview === id) setActiveReview(null)
  }

  function updateForm(id: string, patch: Partial<ExtractionResult>) {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, form: { ...item.form, ...patch } } : item
    ))
  }

  // ── Upload & extract all queued files ──
  async function handleUploadAll() {
    if (!accountId) return
    setRunning(true)

    const queued = items.filter(i => i.status === 'queued')

    for (const item of queued) {
      // Mark uploading
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'uploading' } : i))

      const fd = new FormData()
      fd.append('file', item.file)
      fd.append('account_id', accountId)

      try {
        const res  = await fetch('/api/invoices/upload', { method: 'POST', body: fd })
        const data = await res.json()

        if (res.status === 409) {
          setItems(prev => prev.map(i => i.id === item.id
            ? { ...i, status: 'error', error: `Duplicate file: ${data.message}` } : i))
          continue
        }

        if (!res.ok) {
          setItems(prev => prev.map(i => i.id === item.id
            ? { ...i, status: 'error', error: data.error || 'Upload failed' } : i))
          continue
        }

        setItems(prev => prev.map(i => i.id === item.id ? {
          ...i,
          status:      'extracted',
          invoiceId:   data.invoice.id,
          form:        data.extraction,
          isDuplicate: data.is_duplicate,
          duplicateOf: data.duplicate_of,
          confidence:  data.extraction.confidence,
        } : i))

      } catch {
        setItems(prev => prev.map(i => i.id === item.id
          ? { ...i, status: 'error', error: 'Network error' } : i))
      }
    }

    setRunning(false)
    // Open first extracted for review
    const firstExtracted = items.find(i => i.status === 'extracted')
    if (firstExtracted) setActiveReview(firstExtracted.id)
  }

  // ── Save a single invoice ──
  async function handleSave(id: string) {
    const item = items.find(i => i.id === id)
    if (!item?.invoiceId || !item.form) return

    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'uploading' } : i))

    await fetch(`/api/invoices/${item.invoiceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vendor_name_raw: item.form.vendor_name,
        invoice_number:  item.form.invoice_number,
        invoice_date:    item.form.invoice_date,
        currency:        item.form.currency,
        subtotal:        item.form.subtotal,
        tax_amount:      item.form.tax_amount,
        tax_included:    item.form.tax_included,
        total_amount:    item.form.total_amount,
        category:        item.form.category,
        notes:           item.form.notes,
      }),
    })

    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'saved' } : i))
    setActiveReview(null)

    // Auto-open next extracted
    const next = items.find(i => i.status === 'extracted' && i.id !== id)
    if (next) setActiveReview(next.id)
  }

  // ── Save all extracted at once ──
  async function handleSaveAll() {
    const extracted = items.filter(i => i.status === 'extracted')
    for (const item of extracted) await handleSave(item.id)
  }

  const queued    = items.filter(i => i.status === 'queued').length
  const extracted = items.filter(i => i.status === 'extracted').length
  const saved     = items.filter(i => i.status === 'saved').length
  const errors    = items.filter(i => i.status === 'error').length
  const allDone   = items.length > 0 && items.every(i => i.status === 'saved' || i.status === 'error')

  return (
    <div className="fade-in" style={{ maxWidth: 860 }}>
      <div style={{ marginBottom: 28 }}>
        <p style={overline}>Upload</p>
        <h1 style={h1}>New Invoices</h1>
      </div>

      {/* ── Account selector + drop zone ── */}
      <Card style={{ marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '0 0 220px' }}>
            <label style={fieldLabel}>Assign all to Account *</label>
            <select value={accountId} onChange={e => setAccountId(e.target.value)} style={inputStyle}>
              <option value=''>Select account…</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'flex-end' }}>
            {extracted > 0 && (
              <Button variant="secondary" onClick={handleSaveAll} disabled={running}>
                <CheckCircle size={13} /> Save All ({extracted})
              </Button>
            )}
            {queued > 0 && (
              <Button onClick={handleUploadAll} disabled={!accountId || running} style={{ minWidth: 160, justifyContent: 'center' }}>
                {running
                  ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Extracting…</>
                  : <><Upload size={13} /> Upload {queued} File{queued !== 1 ? 's' : ''}</>}
              </Button>
            )}
          </div>
        </div>

        {/* Drop zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          style={{
            padding: '32px 28px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragOver ? 'var(--surface-3)' : 'transparent',
            borderBottom: items.length > 0 ? '1px solid var(--border)' : 'none',
            transition: 'background 0.15s',
            borderTop: dragOver ? '2px dashed var(--text)' : '2px dashed var(--border)',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/*"
            multiple
            style={{ display: 'none' }}
            onChange={e => { if (e.target.files) { addFiles(Array.from(e.target.files)); e.target.value = '' } }}
          />
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
            <Plus size={18} color="var(--text-muted)" />
          </div>
          <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>Drop invoices here or click to browse</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>PDF, JPG, PNG · Multiple files supported</p>
        </div>

        {/* File queue */}
        {items.length > 0 && (
          <div>
            {items.map(item => (
              <FileRow
                key={item.id}
                item={item}
                isReviewing={activeReview === item.id}
                onReview={() => setActiveReview(activeReview === item.id ? null : item.id)}
                onRemove={() => removeItem(item.id)}
                onSave={() => handleSave(item.id)}
              />
            ))}
          </div>
        )}
      </Card>

      {/* ── Review panel for active item ── */}
      {activeReview && (() => {
        const item = items.find(i => i.id === activeReview)
        if (!item || item.status !== 'extracted') return null

        return (
          <Card style={{ overflow: 'hidden' }}>
            {/* Panel header */}
            <div style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Reviewing — {item.file.name}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {/* Confidence */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>AI confidence</span>
                  <div style={{ width: 64, height: 4, background: 'var(--border)', borderRadius: 2 }}>
                    <div style={{ height: '100%', borderRadius: 2, width: `${(item.confidence ?? 0) * 100}%`, background: (item.confidence ?? 0) > 0.8 ? '#15803D' : (item.confidence ?? 0) > 0.5 ? '#D97706' : '#DC2626' }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{Math.round((item.confidence ?? 0) * 100)}%</span>
                </div>
                <button onClick={() => setActiveReview(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={14} /></button>
              </div>
            </div>

            {/* Duplicate warning */}
            {item.isDuplicate && (
              <div style={{ display: 'flex', gap: 10, background: '#FFFBEB', borderBottom: '1px solid #FDE68A', padding: '11px 20px', color: '#92400E', fontSize: 13 }}>
                <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                <span><strong>Possible duplicate.</strong> A similar invoice from this vendor exists this month.{' '}
                  {item.duplicateOf && <a href={`/invoices/${item.duplicateOf}`} style={{ textDecoration: 'underline' }}>View it</a>}
                </span>
              </div>
            )}

            {/* Two-column: preview + form */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 500 }}>

              {/* Left — file preview */}
              <div style={{ borderRight: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', flexDirection: 'column' }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>Preview</p>
                <FilePreview file={item.file} />
              </div>

              {/* Right — extracted fields */}
              <div style={{ overflowY: 'auto', maxHeight: 600 }}>
                <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <FF label="Vendor Name *"  value={item.form?.vendor_name   ?? ''} onChange={v => updateForm(item.id, { vendor_name:    v })} />
                  <FF label="Invoice Number" value={item.form?.invoice_number ?? ''} onChange={v => updateForm(item.id, { invoice_number: v })} mono />
                  <FF label="Invoice Date *" type="date" value={item.form?.invoice_date ?? ''} onChange={v => updateForm(item.id, { invoice_date: v })} />
                  <FF label="Due Date"       type="date" value={item.form?.due_date     ?? ''} onChange={v => updateForm(item.id, { due_date:     v })} />
                  <FF label="Currency"       value={item.form?.currency ?? 'USD'}              onChange={v => updateForm(item.id, { currency:     v })} />
                  <FF label="Subtotal"       type="number" value={String(item.form?.subtotal ?? '')} onChange={v => updateForm(item.id, { subtotal: v ? parseFloat(v) : null })} />
                  <FF label="Tax Amount"     type="number" value={String(item.form?.tax_amount ?? '0')} onChange={v => updateForm(item.id, { tax_amount: parseFloat(v) || 0 })} />
                  <FF label="Total Amount *" type="number" value={String(item.form?.total_amount ?? '')} onChange={v => updateForm(item.id, { total_amount: parseFloat(v) })} />
                </div>

                <div style={{ padding: '0 20px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={fieldLabel}>Category</label>
                    <select value={item.form?.category ?? 'other'} onChange={e => updateForm(item.id, { category: e.target.value as InvoiceCategory })} style={inputStyle}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 12.5, color: 'var(--text-muted)' }}>
                      <input type="checkbox" checked={item.form?.tax_included ?? false} onChange={e => updateForm(item.id, { tax_included: e.target.checked })} />
                      Tax included in total
                    </label>
                  </div>
                </div>

                <div style={{ padding: '0 20px 20px' }}>
                  <label style={fieldLabel}>Notes</label>
                  <textarea value={item.form?.notes ?? ''} onChange={e => updateForm(item.id, { notes: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Optional…" />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ borderTop: '2px dashed var(--border)', padding: '12px 20px', background: 'var(--surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {extracted > 1 ? `${extracted} invoices awaiting review` : ''}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" onClick={() => setActiveReview(null)}>
                  Review Later
                </Button>
                <Button onClick={() => handleSave(item.id)}>
                  <CheckCircle size={12} /> Save Invoice
                </Button>
              </div>
            </div>
          </Card>
        )
      })()}

      {/* ── All done summary ── */}
      {allDone && saved > 0 && (
        <Card style={{ padding: '32px', textAlign: 'center', marginTop: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <CheckCircle size={24} color="#15803D" />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
            {saved} Invoice{saved !== 1 ? 's' : ''} Saved
          </h2>
          {errors > 0 && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 6 }}>{errors} file{errors !== 1 ? 's' : ''} had errors</p>}
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 22 }}>
            All uploaded invoices are pending review
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <Button variant="secondary" onClick={() => { setItems([]); setAccountId('') }}>
              Upload More
            </Button>
            <Button onClick={() => router.push('/invoices')}>
              View Invoices <ChevronRight size={13} />
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

// ── File row in queue ──
function FileRow({
  item, isReviewing, onReview, onRemove, onSave,
}: {
  item: FileItem
  isReviewing: boolean
  onReview: () => void
  onRemove: () => void
  onSave: () => void
}) {
  const statusConfig = {
    queued:    { color: 'var(--text-muted)', label: 'Queued',      bg: 'transparent'   },
    uploading: { color: '#D97706',           label: 'Extracting…', bg: '#FFFBEB'        },
    extracted: { color: '#1D4ED8',           label: 'Review',      bg: '#EFF6FF'        },
    saved:     { color: '#15803D',           label: 'Saved',       bg: '#F0FDF4'        },
    error:     { color: '#B91C1C',           label: 'Error',       bg: '#FEF2F2'        },
  }
  const { color, label, bg } = statusConfig[item.status]

  return (
    <div style={{ borderBottom: '1px solid var(--border)', background: isReviewing ? 'var(--surface-3)' : 'transparent', transition: 'background 0.12s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px' }}>
        {/* Icon */}
        <div style={{ width: 32, height: 32, borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {item.status === 'uploading'
            ? <Loader size={14} color={color} style={{ animation: 'spin 1s linear infinite' }} />
            : item.status === 'saved'
            ? <CheckCircle size={14} color={color} />
            : item.status === 'error'
            ? <AlertTriangle size={14} color={color} />
            : <FileText size={14} color="var(--text-muted)" />}
        </div>

        {/* File info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 500, fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.file.name}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {(item.file.size / 1024).toFixed(1)} KB
            {item.isDuplicate && <span style={{ color: '#D97706', marginLeft: 6 }}>· Possible duplicate</span>}
            {item.status === 'error' && <span style={{ color: '#B91C1C', marginLeft: 6 }}>· {item.error}</span>}
          </p>
        </div>

        {/* Confidence bar (extracted only) */}
        {item.status === 'extracted' && item.confidence !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <div style={{ width: 48, height: 3, background: 'var(--border)', borderRadius: 2 }}>
              <div style={{ height: '100%', borderRadius: 2, width: `${item.confidence * 100}%`, background: item.confidence > 0.8 ? '#15803D' : '#D97706' }} />
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>{Math.round(item.confidence * 100)}%</span>
          </div>
        )}

        {/* Status badge */}
        <span style={{ fontSize: 11, fontWeight: 600, color, background: bg, padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>
          {label}
        </span>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {item.status === 'extracted' && (
            <>
              <button onClick={onReview} style={{ fontSize: 11, fontWeight: 600, color: '#1D4ED8', background: isReviewing ? '#DBEAFE' : '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 5, padding: '3px 9px', cursor: 'pointer' }}>
                {isReviewing ? 'Close' : 'Review'}
              </button>
              <button onClick={onSave} style={{ fontSize: 11, fontWeight: 600, color: '#15803D', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 5, padding: '3px 9px', cursor: 'pointer' }}>
                Save
              </button>
            </>
          )}
          {item.status === 'saved' && (
            <button onClick={() => window.open(`/invoices/${item.invoiceId}`, '_blank')} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 9px', cursor: 'pointer' }}>
              View
            </button>
          )}
          {(item.status === 'queued' || item.status === 'error') && (
            <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}>
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── File preview (PDF or image) ──
function FilePreview({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  if (!url) return null

  const isPDF = file.type === 'application/pdf'

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {isPDF ? (
        <iframe
          src={url}
          style={{ flex: 1, width: '100%', minHeight: 460, border: 'none' }}
          title="Invoice PDF"
        />
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Invoice"
            style={{ maxWidth: '100%', maxHeight: 520, borderRadius: 6, boxShadow: '0 2px 12px rgba(0,0,0,0.1)', border: '1px solid var(--border)' }}
          />
        </div>
      )}
    </div>
  )
}

// ── Form field ──
function FF({ label, value, onChange, type = 'text', mono }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; mono?: boolean
}) {
  return (
    <div>
      <label style={fieldLabel}>{label}</label>
      <input
        type={type} value={value}
        onChange={e => onChange(e.target.value)}
        step={type === 'number' ? '0.01' : undefined}
        style={{ ...inputStyle, fontFamily: mono ? 'monospace' : 'inherit' }}
      />
    </div>
  )
}

const overline: React.CSSProperties   = { fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }
const h1: React.CSSProperties         = { fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }
const fieldLabel: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }
const inputStyle: React.CSSProperties = { width: '100%', border: '1px solid var(--border-2)', borderRadius: 7, padding: '8px 10px', color: 'var(--text)', outline: 'none', fontSize: 13 }
