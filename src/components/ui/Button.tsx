import { CSSProperties, ReactNode, ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
  children: ReactNode
  style?: CSSProperties
}

const variants = {
  primary:   { background: '#1C1917', color: '#FFFFFF', border: '1px solid #1C1917' },
  secondary: { background: '#FFFFFF', color: '#1C1917', border: '1px solid var(--border-2)' },
  danger:    { background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' },
  ghost:     { background: 'transparent', color: 'var(--text-muted)', border: '1px solid transparent' },
}

const sizes = {
  sm: { padding: '5px 11px', fontSize: 12, borderRadius: 6, fontWeight: 500 },
  md: { padding: '8px 16px', fontSize: 13.5, borderRadius: 7, fontWeight: 500 },
}

export default function Button({
  variant = 'primary', size = 'md', children, style, disabled, ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'opacity 0.12s',
        letterSpacing: '-0.01em',
        lineHeight: 1,
        ...variants[variant],
        ...sizes[size],
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  )
}
