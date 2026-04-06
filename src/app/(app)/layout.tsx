import Sidebar from '@/components/ui/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar />
      <main style={{
        flex: 1,
        padding: '36px 40px',
        overflowY: 'auto',
        minWidth: 0,
      }}>
        {children}
      </main>
    </div>
  )
}
