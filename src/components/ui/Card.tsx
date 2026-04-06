import { CSSProperties, ReactNode } from 'react'

export default function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      className="paper-card"
      style={{
        border: '1px solid var(--border)',
        borderRadius: 10,
        /* Layered shadow: sharp top highlight + soft bottom drop — physical paper feel */
        boxShadow:
          '0 1px 0 0 rgba(255,255,255,0.8) inset,' +    /* top inner highlight */
          '0 1px 3px rgba(0,0,0,0.07),' +               /* base shadow */
          '0 4px 12px rgba(0,0,0,0.05)',                 /* soft ambient */
        ...style,
      }}
    >
      {children}
    </div>
  )
}
