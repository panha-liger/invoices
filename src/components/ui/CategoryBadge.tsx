import { InvoiceCategory } from '@/types'

const config: Record<InvoiceCategory, { color: string; bg: string }> = {
  marketing:  { color: '#86198F', bg: '#FAF5FF' },
  office:     { color: '#1D4ED8', bg: '#EFF6FF' },
  software:   { color: '#5B21B6', bg: '#F5F3FF' },
  inventory:  { color: '#14532D', bg: '#F0FDF4' },
  logistics:  { color: '#92400E', bg: '#FFFBEB' },
  other:      { color: '#44403C', bg: '#F5F5F4' },
}

export default function CategoryBadge({ category }: { category: InvoiceCategory }) {
  const { color, bg } = config[category] ?? config.other
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 600,
      background: bg,
      color,
      textTransform: 'capitalize',
      letterSpacing: '0.01em',
    }}>
      {category}
    </span>
  )
}
