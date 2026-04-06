'use client'

import { useState, useEffect } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Download, Loader, CheckCircle, FileArchive, AlertCircle } from 'lucide-react'
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

type Stage = 'idle'|'loading'|'done'|'error'
interface ExportResult { download_url:string; invoice_count:number; total_amount:number; filename:string }

function fmt(n: number) {
  return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n)
}

export default function ExportPage() {
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([])
  const [accountId, setAccountId] = useState('')
  const [year, setYear]   = useState(new Date().getFullYear().toString())
  const [month, setMonth] = useState(String(new Date().getMonth()+1).padStart(2,'0'))
  const [stage, setStage] = useState<Stage>('idle')
  const [result, setResult] = useState<ExportResult|null>(null)
  const [error, setError]   = useState('')

  useEffect(() => {
    fetch('/api/accounts').then(r => r.json()).then(setAccounts)
  }, [])

  async function handleExport() {
    if (!accountId) return
    setStage('loading'); setError('')
    try {
      const res  = await fetch('/api/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({account_id:accountId,year,month:parseInt(month)})})
      const data = await res.json()
      if (!res.ok) { setError(data.error||'Export failed'); setStage('error'); return }
      setResult(data); setStage('done')
    } catch { setError('Network error.'); setStage('error') }
  }

  return (
    <div style={{ maxWidth:560 }} className="fade-in">
      <div style={{ marginBottom:28 }}>
        <p style={overline}>Reports</p>
        <h1 style={h1}>Export Invoices</h1>
      </div>

      {/* Config card */}
      <Card style={{ overflow:'hidden', marginBottom:12 }}>
        {/* Paper header strip */}
        <div style={{ background:'var(--surface-2)', borderBottom:'1px solid var(--border)', padding:'14px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <p style={{ fontSize:10, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--text-muted)' }}>Export Configuration</p>
          <p style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>
            {accountId ? accounts.find(a=>a.id===accountId)?.name : '—'} · {MONTH_NAMES[parseInt(month)-1]} {year}
          </p>
        </div>

        <div style={{ padding:'22px 24px', display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
            <div>
              <label style={fieldLabel}>Account *</label>
              <select value={accountId} onChange={e=>setAccountId(e.target.value)} style={inputStyle}>
                <option value=''>Select account…</option>
                {accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label style={fieldLabel}>Year</label>
              <select value={year} onChange={e=>setYear(e.target.value)} style={inputStyle}>
                {[2023,2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label style={fieldLabel}>Month</label>
              <select value={month} onChange={e=>setMonth(e.target.value)} style={inputStyle}>
                {MONTH_NAMES.map((m,i)=><option key={i} value={String(i+1).padStart(2,'0')}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Contents */}
          <div style={{ border:'1px solid var(--border)', borderRadius:8, overflow:'hidden' }}>
            <div style={{ background:'var(--surface-2)', padding:'8px 14px', borderBottom:'1px solid var(--border)' }}>
              <p style={{ fontSize:10, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', color:'var(--text-muted)' }}>ZIP Contents</p>
            </div>
            {[
              ['summary.csv',  'All invoice data in spreadsheet format'],
              ['invoices/',    'All original PDF and image files'],
              ['Scope',        'Approved invoices only'],
            ].map(([k,v])=>(
              <div key={k} style={{ display:'flex', gap:14, padding:'9px 14px', borderBottom:'1px solid var(--border)', fontSize:12 }}>
                <span style={{ fontFamily:'monospace', fontWeight:600, color:'var(--text)', minWidth:96 }}>{k}</span>
                <span style={{ color:'var(--text-muted)' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ borderTop:'2px dashed var(--border)', padding:'13px 24px', background:'var(--surface-2)', display:'flex', justifyContent:'flex-end' }}>
          <Button onClick={handleExport} disabled={!accountId||stage==='loading'} style={{ minWidth:170, justifyContent:'center' }}>
            {stage==='loading'
              ? <><Loader size={13} style={{ animation:'spin 1s linear infinite' }}/> Generating…</>
              : <><Download size={13}/> Generate Export</>}
          </Button>
        </div>
      </Card>

      {/* Error */}
      {stage==='error' && (
        <Card style={{ padding:'18px 22px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            <AlertCircle size={16} color="#B91C1C"/>
            <div>
              <p style={{ fontWeight:600, color:'#B91C1C', fontSize:13 }}>Export Failed</p>
              <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{error}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Success */}
      {stage==='done' && result && (
        <Card style={{ overflow:'hidden' }}>
          <div style={{ background:'#F0FDF4', borderBottom:'1px solid #BBF7D0', padding:'18px 24px', display:'flex', alignItems:'center', gap:12 }}>
            <CheckCircle size={20} color="#15803D"/>
            <div>
              <p style={{ fontWeight:700, fontSize:14, color:'#14532D' }}>Export Ready</p>
              <p style={{ fontSize:12, color:'#15803D', marginTop:1 }}>{result.invoice_count} invoices · {fmt(result.total_amount)}</p>
            </div>
          </div>
          <div style={{ padding:'20px 24px' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:9, marginBottom:18 }}>
              <Row label="File"         value={result.filename}                mono />
              <Row label="Invoices"     value={String(result.invoice_count)}        />
              <Row label="Total Amount" value={fmt(result.total_amount)}            />
            </div>
            <a
              href={result.download_url} download={result.filename}
              style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'10px 0', background:'#1C1917', color:'#fff', borderRadius:8, fontWeight:600, fontSize:13 }}
            >
              <FileArchive size={15}/> Download ZIP
            </a>
            <p style={{ textAlign:'center', fontSize:11, color:'var(--text-muted)', marginTop:8 }}>Download link expires in 1 hour</p>
          </div>
        </Card>
      )}
    </div>
  )
}

function Row({ label, value, mono }: { label:string; value:string; mono?:boolean }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, paddingBottom:8, borderBottom:'1px solid var(--border)' }}>
      <span style={{ color:'var(--text-muted)' }}>{label}</span>
      <span style={{ fontWeight:600, fontFamily:mono?'monospace':'inherit' }}>{value}</span>
    </div>
  )
}

const overline: React.CSSProperties   = { fontSize:11, fontWeight:600, letterSpacing:'0.08em', color:'var(--text-muted)', textTransform:'uppercase', marginBottom:4 }
const h1: React.CSSProperties         = { fontSize:24, fontWeight:700, letterSpacing:'-0.02em', color:'var(--text)' }
const fieldLabel: React.CSSProperties = { fontSize:10, fontWeight:700, color:'var(--text-muted)', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.07em' }
const inputStyle: React.CSSProperties = { width:'100%', background:'var(--surface-2)', border:'1px solid var(--border-2)', borderRadius:7, padding:'8px 10px', color:'var(--text)', outline:'none', fontSize:13, cursor:'pointer' }
