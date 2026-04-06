import { InvoiceStatus } from '@/types'

const config: Record<InvoiceStatus, { label: string; color: string; bg: string; dot: string }> = {
  pending:  { label: 'Pending',  color: '#92400E', bg: '#FFFBEB', dot: '#D97706' },
  reviewed: { label: 'Reviewed', color: '#1E40AF', bg: '#EFF6FF', dot: '#3B82F6' },
  approved: { label: 'Approved', color: '#14532D', bg: '#F0FDF4', dot: '#16A34A' },
  rejected: { label: 'Rejected', color: '#7F1D1D', bg: '#FEF2F2', dot: '#DC2626' },
}

export default function StatusBadge({ status }: { status: InvoiceStatus }) {
  const { label, color, bg, dot } = config[status] ?? config.pending
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '3px 9px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 600,
      background: bg,
      color,
      border: `1px solid ${dot}30`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: dot, display: 'inline-block', flexShrink: 0 }} />
      {label}
    </span>
  )
}
