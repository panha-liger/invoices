'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import Card from '@/components/ui/Card'
import { TrendingUp, FileText, Receipt, Tag } from 'lucide-react'
import { DashboardSummary } from '@/types'

const CATEGORY_COLORS: Record<string, string> = {
  marketing: '#EC4899', office: '#3B82F6', software: '#8B5CF6',
  inventory: '#10B981', logistics: '#F59E0B', other: '#9CA3AF',
}

const ACCOUNTS = [
  { id: '', name: 'All Accounts' },
  { id: 'reai', name: 'RE:AI' },
  { id: 'newwave', name: 'neWwave' },
]

function fmt(n: number, compact = false) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    maximumFractionDigits: compact ? 0 : 2,
  }).format(n)
}

export default function DashboardPage() {
  const [data, setData]       = useState<DashboardSummary | null>(null)
  const [accountId, setAccountId] = useState('')
  const [year, setYear]       = useState(new Date().getFullYear().toString())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const p = new URLSearchParams({ year })
    if (accountId) p.set('account_id', accountId)
    fetch(`/api/dashboard/summary?${p}`)
      .then(r => r.json()).then(setData).finally(() => setLoading(false))
  }, [accountId, year])

  const stats = [
    { label: 'Total Spend', value: data ? fmt(data.total_amount, true)      : '—', icon: TrendingUp, accent: '#00B4B4' },
    { label: 'Invoices',    value: data ? String(data.invoice_count)         : '—', icon: FileText,   accent: '#3B82F6' },
    { label: 'Tax Paid',    value: data ? fmt(data.total_tax, true)          : '—', icon: Receipt,    accent: '#F59E0B' },
    { label: 'Categories',  value: data ? String(data.by_category.length)   : '—', icon: Tag,        accent: '#8B5CF6' },
  ]

  return (
    <div className="fade-in">
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div>
          <p style={overline}>Overview</p>
          <h1 style={h1}>Dashboard</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={accountId} onChange={e => setAccountId(e.target.value)} style={sel}>
            {ACCOUNTS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select value={year} onChange={e => setYear(e.target.value)} style={sel}>
            {[2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {stats.map(({ label, value, icon: Icon, accent }) => (
          <Card key={label} style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 7 }}>{label}</p>
                <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>
                  {loading ? <Shimmer w={70} h={22} /> : value}
                </div>
              </div>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: `${accent}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={15} color={accent} strokeWidth={2} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 12, marginBottom: 12 }}>

        {/* Bar chart */}
        <Card style={{ padding: '22px 24px' }}>
          <p style={sectionLabel}>Monthly Spending</p>
          {loading ? <Shimmer w="100%" h={200} /> : data && data.by_month.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={data.by_month} barSize={20} margin={{ top: 4, right: 0, left: -14, bottom: 0 }}>
                <XAxis dataKey="month" tickFormatter={v => new Date(v+'-01').toLocaleString('en',{month:'short'})} tick={{ fill:'var(--text-muted)', fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fill:'var(--text-muted)', fontSize:11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={v => [fmt(Number(v)), 'Total']}
                  contentStyle={{ background:'#fff', border:'1px solid var(--border)', borderRadius:8, fontSize:12, boxShadow:'0 4px 16px rgba(0,0,0,0.08)' }}
                  cursor={{ fill:'rgba(0,0,0,0.03)' }}
                />
                <Bar dataKey="total" fill="#1C1917" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState label="No spending data for this period" />}
        </Card>

        {/* Pie chart */}
        <Card style={{ padding: '22px 20px' }}>
          <p style={sectionLabel}>By Category</p>
          {loading ? <Shimmer w="100%" h={200} /> : data && data.by_category.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={data.by_category} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={60} innerRadius={32} strokeWidth={2} stroke="#fff">
                    {data.by_category.map(e => <Cell key={e.category} fill={CATEGORY_COLORS[e.category] ?? '#9CA3AF'} />)}
                  </Pie>
                  <Tooltip formatter={v => [fmt(Number(v))]} contentStyle={{ background:'#fff', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ borderTop:'1px solid var(--border)', paddingTop:12, marginTop:8, display:'flex', flexDirection:'column', gap:6 }}>
                {data.by_category.map(c => (
                  <div key={c.category} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ width:7, height:7, borderRadius:2, background: CATEGORY_COLORS[c.category]??'#9CA3AF', display:'inline-block' }} />
                      <span style={{ fontSize:12, color:'var(--text-muted)', textTransform:'capitalize' }}>{c.category}</span>
                    </div>
                    <span style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>{fmt(c.total, true)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <EmptyState label="No categories yet" />}
        </Card>
      </div>

      {/* Monthly table */}
      {data && data.by_month.length > 0 && (
        <Card>
          <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)' }}>
            <p style={sectionLabel}>Monthly Breakdown</p>
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'var(--surface-2)', borderBottom:'1px solid var(--border)' }}>
                {['Month','Invoices','Total Spend'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.by_month.map((row, i) => (
                <tr key={row.month} style={{ borderBottom: i < data.by_month.length-1 ? '1px solid var(--border)' : 'none' }}>
                  <td style={tdStyle}>{new Date(row.month+'-01').toLocaleString('en',{month:'long',year:'numeric'})}</td>
                  <td style={tdStyle}>{row.count}</td>
                  <td style={{ ...tdStyle, fontWeight:600 }}>{fmt(row.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

function Shimmer({ w, h }: { w: number|string; h: number }) {
  return <div style={{ width:w, height:h, borderRadius:6, background:'var(--surface-2)', animation:'pulse 1.4s ease-in-out infinite' }} />
}
function EmptyState({ label }: { label: string }) {
  return <div style={{ height:180, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', fontSize:13 }}>{label}</div>
}

const overline: React.CSSProperties = { fontSize:11, fontWeight:600, letterSpacing:'0.08em', color:'var(--text-muted)', textTransform:'uppercase', marginBottom:4 }
const h1: React.CSSProperties       = { fontSize:24, fontWeight:700, letterSpacing:'-0.02em', color:'var(--text)' }
const sectionLabel: React.CSSProperties = { fontSize:11, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:14 }
const sel: React.CSSProperties      = { background:'var(--surface)', border:'1px solid var(--border-2)', borderRadius:7, padding:'6px 10px', color:'var(--text)', outline:'none', cursor:'pointer', fontSize:13 }
const thStyle: React.CSSProperties  = { padding:'9px 20px', textAlign:'left', fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }
const tdStyle: React.CSSProperties  = { padding:'11px 20px', fontSize:13, color:'var(--text)' }
