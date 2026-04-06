'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { Invoice, InvoiceCategory, InvoiceStatus } from '@/types'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import StatusBadge from '@/components/ui/StatusBadge'
import AccountBadge from '@/components/ui/AccountBadge'
import CategoryBadge from '@/components/ui/CategoryBadge'
import { ArrowLeft, Check, X, AlertTriangle, Edit2, Save, FileText, ExternalLink, Trash2 } from 'lucide-react'

const CATEGORIES: InvoiceCategory[] = ['marketing','office','software','inventory','logistics','other']

function fmt(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style:'currency', currency, maximumFractionDigits:2 }).format(n)
}

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }   = use(params)
  const router   = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [form, setForm]       = useState<Partial<Invoice>>({})
  const [fileInfo, setFileInfo] = useState<{ url: string; file_type: string; file_name: string } | null>(null)

  useEffect(() => {
    fetch(`/api/invoices/${id}`).then(r=>r.json()).then(d => { setInvoice(d); setForm(d) }).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    fetch(`/api/invoices/${id}/file-url`).then(r => r.ok ? r.json() : null).then(d => { if (d?.url) setFileInfo(d) })
  }, [id])

  async function handleSave() {
    setSaving(true)
    const res = await fetch(`/api/invoices/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) })
    setInvoice(await res.json()); setEditing(false); setSaving(false)
  }
  async function handleApprove() {
    setSaving(true)
    setInvoice(await (await fetch(`/api/invoices/${id}/approve`, { method:'POST' })).json()); setSaving(false)
  }
  async function handleReject() {
    if (!confirm('Reject this invoice?')) return
    setSaving(true)
    await fetch(`/api/invoices/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ status:'rejected' }) })
    setInvoice(await (await fetch(`/api/invoices/${id}`)).json())
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm('Permanently delete this invoice? This cannot be undone.')) return
    setSaving(true)
    await fetch(`/api/invoices/${id}`, { method:'DELETE' })
    router.push('/invoices')
  }

  if (loading) return <div style={{ padding:60, textAlign:'center', color:'var(--text-muted)' }}>Loading…</div>
  if (!invoice) return <div style={{ color:'var(--danger)' }}>Invoice not found.</div>

  const f = (k: keyof Invoice) => String((form[k] ?? invoice[k]) ?? '')

  return (
    <div style={{ maxWidth:880 }} className="fade-in">
      {/* Back */}
      <button onClick={() => router.back()} style={{ display:'flex', alignItems:'center', gap:6, color:'var(--text-muted)', background:'none', border:'none', marginBottom:20, fontSize:13, cursor:'pointer' }}>
        <ArrowLeft size={14} /> Back to Invoices
      </button>

      {/* Duplicate warning */}
      {invoice.is_duplicate && (
        <div style={{ display:'flex', alignItems:'center', gap:10, background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:8, padding:'11px 16px', marginBottom:16, color:'#92400E', fontSize:13 }}>
          <AlertTriangle size={14} />
          <span><strong>Possible duplicate</strong> — a similar invoice exists this month.{' '}{invoice.duplicate_of && <a href={`/invoices/${invoice.duplicate_of}`} style={{ textDecoration:'underline' }}>View original</a>}</span>
        </div>
      )}

      {/* ── Paper invoice card ── */}
      <Card style={{ overflow:'hidden' }}>

        {/* Invoice header — clean white with ruled bottom */}
        <div style={{ padding:'28px 32px 24px', borderBottom:'2px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <p style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'var(--text-muted)', textTransform:'uppercase', marginBottom:6 }}>Invoice</p>
            <h1 style={{ fontSize:22, fontWeight:700, letterSpacing:'-0.02em', color:'var(--text)', marginBottom:6 }}>
              {invoice.vendor_name_raw || 'Unknown Vendor'}
            </h1>
            {invoice.invoice_number && (
              <p style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'monospace' }}>#{invoice.invoice_number}</p>
            )}
            <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
              <StatusBadge status={invoice.status as InvoiceStatus} />
              {invoice.account && <AccountBadge name={invoice.account.name} />}
              <CategoryBadge category={invoice.category as InvoiceCategory} />
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <p style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'var(--text-muted)', textTransform:'uppercase', marginBottom:6 }}>Amount Due</p>
            <p style={{ fontSize:30, fontWeight:800, letterSpacing:'-0.03em', color:'var(--text)' }}>
              {fmt(invoice.total_amount, invoice.currency)}
            </p>
            <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>{invoice.currency} · {invoice.invoice_date}</p>
          </div>
        </div>

        {/* Action / confidence bar */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 24px', background:'var(--surface-2)', borderBottom:'1px solid var(--border)' }}>
          {/* Confidence */}
          {invoice.ai_confidence !== null ? (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:11, color:'var(--text-muted)' }}>AI confidence</span>
              <div style={{ width:72, height:4, background:'var(--border)', borderRadius:2 }}>
                <div style={{ height:'100%', borderRadius:2, width:`${(invoice.ai_confidence??0)*100}%`, background: (invoice.ai_confidence??0)>0.8?'#16A34A':(invoice.ai_confidence??0)>0.5?'#D97706':'#DC2626' }} />
              </div>
              <span style={{ fontSize:11, fontWeight:600, color:'var(--text)' }}>{Math.round((invoice.ai_confidence??0)*100)}%</span>
            </div>
          ) : <span />}

          {/* Actions */}
          <div style={{ display:'flex', gap:6 }}>
            {!editing ? (
              <>
                <Button variant="secondary" size="sm" onClick={() => setEditing(true)}><Edit2 size={12}/> Edit</Button>
                {invoice.status !== 'approved' && invoice.status !== 'rejected' && (
                  <Button size="sm" onClick={handleApprove} disabled={saving}><Check size={12}/> Approve</Button>
                )}
                {invoice.status !== 'rejected' && (
                  <Button variant="danger" size="sm" onClick={handleReject} disabled={saving}><X size={12}/> Reject</Button>
                )}
                <Button variant="danger" size="sm" onClick={handleDelete} disabled={saving}><Trash2 size={12}/> Delete</Button>
              </>
            ) : (
              <>
                <Button variant="secondary" size="sm" onClick={() => { setEditing(false); setForm(invoice) }}>Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={saving}><Save size={12}/> {saving?'Saving…':'Save Changes'}</Button>
              </>
            )}
          </div>
        </div>

        {/* Two-column body */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr' }}>

          {/* Left: invoice fields */}
          <div style={{ padding:'24px 28px', borderRight:'1px solid var(--border)' }}>
            <SectionTitle>Invoice Details</SectionTitle>
            <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
              <FieldRow label="Vendor"         value={f('vendor_name_raw')}  editing={editing} onChange={v => setForm(p=>({...p, vendor_name_raw:v}))} />
              <FieldRow label="Invoice #"      value={f('invoice_number')}   editing={editing} onChange={v => setForm(p=>({...p, invoice_number:v}))}   mono />
              <FieldRow label="Invoice Date"   value={f('invoice_date')}     editing={editing} onChange={v => setForm(p=>({...p, invoice_date:v}))}     type="date" />
              <FieldRow label="Due Date"       value={f('due_date')}         editing={editing} onChange={v => setForm(p=>({...p, due_date:v}))}         type="date" />
              <FieldRow label="Currency"       value={f('currency')}         editing={editing} onChange={v => setForm(p=>({...p, currency:v}))}         />

              {/* Category */}
              <div style={{ display:'grid', gridTemplateColumns:'100px 1fr', gap:8, alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                <span style={labelStyle}>Category</span>
                {editing ? (
                  <select value={f('category')} onChange={e => setForm(p=>({...p, category:e.target.value as InvoiceCategory, category_source:'manual'}))} style={editInput}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                  </select>
                ) : (
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <CategoryBadge category={invoice.category as InvoiceCategory} />
                    {invoice.category_source === 'manual' && <span style={{ fontSize:10, color:'var(--text-muted)' }}>edited</span>}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div style={{ padding:'10px 0' }}>
                <p style={{ ...labelStyle, marginBottom:5 }}>Notes</p>
                {editing ? (
                  <textarea value={f('notes')} onChange={e => setForm(p=>({...p, notes:e.target.value}))} rows={3} style={{ ...editInput, resize:'vertical' }} />
                ) : (
                  <p style={{ fontSize:13, color: invoice.notes ? 'var(--text)' : 'var(--text-muted)' }}>{invoice.notes || 'No notes'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Right: amounts + file */}
          <div style={{ padding:'24px 28px' }}>
            <SectionTitle>Amounts</SectionTitle>

            {/* Amount table */}
            <div style={{ border:'1px solid var(--border)', borderRadius:8, overflow:'hidden', marginBottom:16 }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <tbody>
                  <AmountRow label="Subtotal"                                       value={invoice.subtotal !== null ? fmt(invoice.subtotal, invoice.currency) : '—'} />
                  <AmountRow label={`Tax${invoice.tax_included?' (included)':''}`}  value={fmt(invoice.tax_amount, invoice.currency)} muted />
                  <AmountRow label="Total"                                           value={fmt(invoice.total_amount, invoice.currency)} total />
                </tbody>
              </table>
            </div>

            {/* Tax status pill */}
            {!editing ? (
              <div style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 12px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:7 }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background: invoice.tax_included ? '#16A34A' : 'var(--border-2)' }} />
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>Tax {invoice.tax_included ? 'included in total' : 'not included'}</span>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <div>
                  <p style={{ ...labelStyle, marginBottom:5 }}>Tax Amount</p>
                  <input type="number" step="0.01" value={String(form.tax_amount??invoice.tax_amount)} onChange={e => setForm(p=>({...p, tax_amount:parseFloat(e.target.value)}))} style={editInput} />
                </div>
                <div>
                  <p style={{ ...labelStyle, marginBottom:5 }}>Total Amount</p>
                  <input type="number" step="0.01" value={String(form.total_amount??invoice.total_amount)} onChange={e => setForm(p=>({...p, total_amount:parseFloat(e.target.value)}))} style={editInput} />
                </div>
                <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:12, color:'var(--text-muted)' }}>
                  <input type="checkbox" checked={Boolean(form.tax_included??invoice.tax_included)} onChange={e => setForm(p=>({...p, tax_included:e.target.checked}))} />
                  Tax included in total
                </label>
              </div>
            )}

            {/* File info */}
            {invoice.invoice_files && invoice.invoice_files.length > 0 && (
              <div style={{ marginTop:20 }}>
                <SectionTitle>Attached File</SectionTitle>
                {invoice.invoice_files.map(file => (
                  <div key={file.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:8 }}>
                    <FileText size={16} color="var(--text-muted)" />
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{file.file_name}</p>
                      {file.file_size && <p style={{ fontSize:11, color:'var(--text-muted)' }}>{(file.file_size/1024).toFixed(1)} KB</p>}
                    </div>
                    {fileInfo?.url && (
                      <a href={fileInfo.url} target="_blank" rel="noreferrer" style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'var(--accent)', textDecoration:'none', flexShrink:0 }}>
                        <ExternalLink size={11}/> Open
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:'10px 28px', borderTop:'1px solid var(--border)', background:'var(--surface-2)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'monospace' }}>ID: {invoice.id}</span>
          <span style={{ fontSize:11, color:'var(--text-muted)' }}>Added {new Date(invoice.created_at).toLocaleDateString('en-US',{dateStyle:'medium'})}</span>
        </div>
      </Card>

      {/* File viewer */}
      {fileInfo && (
        <Card style={{ marginTop: 16, overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              {fileInfo.file_type === 'application/pdf' ? 'PDF Viewer' : 'Image Preview'}
            </p>
            <a href={fileInfo.url} target="_blank" rel="noreferrer" style={{ display:'flex', alignItems:'center', gap:5, fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}>
              <ExternalLink size={11}/> Open in new tab
            </a>
          </div>
          {fileInfo.file_type === 'application/pdf' ? (
            <iframe
              src={fileInfo.url}
              style={{ width: '100%', height: 800, border: 'none', display: 'block' }}
              title="Invoice PDF"
            />
          ) : (
            <div style={{ padding: 24, display: 'flex', justifyContent: 'center', background: 'var(--surface-2)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fileInfo.url}
                alt="Invoice"
                style={{ maxWidth: '100%', borderRadius: 8, boxShadow: '0 2px 16px rgba(0,0,0,0.10)', border: '1px solid var(--border)' }}
              />
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize:10, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:12, paddingBottom:8, borderBottom:'1px solid var(--border)' }}>{children}</p>
}

function FieldRow({ label, value, editing, onChange, type='text', mono }: {
  label: string; value: string; editing: boolean; onChange:(v:string)=>void; type?:string; mono?:boolean
}) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'100px 1fr', gap:8, alignItems:'center', padding:'9px 0', borderBottom:'1px solid var(--border)' }}>
      <span style={labelStyle}>{label}</span>
      {editing
        ? <input type={type} value={value||''} onChange={e=>onChange(e.target.value)} style={{ ...editInput, fontFamily:mono?'monospace':'inherit' }} />
        : <span style={{ fontSize:13, color:'var(--text)', fontFamily:mono?'monospace':'inherit' }}>{value||'—'}</span>
      }
    </div>
  )
}

function AmountRow({ label, value, muted, total }: { label:string; value:string; muted?:boolean; total?:boolean }) {
  return (
    <tr style={{ borderBottom: total?'none':'1px solid var(--border)', background:total?'var(--surface-2)':'transparent' }}>
      <td style={{ padding:'10px 14px', fontSize:13, color:muted?'var(--text-muted)':'var(--text)', fontWeight:total?700:400 }}>{label}</td>
      <td style={{ padding:'10px 14px', textAlign:'right', fontSize:total?15:13, fontWeight:total?700:500, fontFamily:'monospace' }}>{value}</td>
    </tr>
  )
}

const labelStyle: React.CSSProperties = { fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.04em' }
const editInput:  React.CSSProperties = { width:'100%', background:'var(--surface-2)', border:'1px solid var(--border-2)', borderRadius:6, padding:'6px 9px', color:'var(--text)', outline:'none', fontSize:13 }
