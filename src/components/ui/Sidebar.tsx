'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, FileText, Upload, Download, LogOut, Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/invoices',  label: 'Invoices',  icon: FileText  },
  { href: '/upload',    label: 'Upload',     icon: Upload    },
  { href: '/export',    label: 'Export',     icon: Download  },
  { href: '/settings',  label: 'Settings',   icon: Settings  },
]

export default function Sidebar() {
  const path = usePathname()
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null)
    })
    fetch('/api/accounts').then(r => r.json()).then(d => { if (Array.isArray(d)) setAccounts(d) })
  }, [])

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside
      className="paper-sidebar"
      style={{
        width: 224,
        minHeight: '100vh',
        height: '100vh',
        position: 'sticky',
        top: 0,
        borderRight: '1px solid var(--sidebar-border)',
        /* right-side paper edge shadow */
        boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div style={{
        padding: '22px 20px 18px',
        borderBottom: '1px solid var(--sidebar-border)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <Image src="/logo.png" alt="neWwave" width={34} height={34} style={{ borderRadius: 8 }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            neWwave
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
            Invoice Manager
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '14px 10px', flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--sidebar-muted)', padding: '0 10px', marginBottom: 6, textTransform: 'uppercase' }}>
          Menu
        </div>
        {nav.map(({ href, label, icon: Icon }) => {
          const active = path.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '8px 10px',
                borderRadius: 7,
                marginBottom: 1,
                fontSize: 13.5,
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--sidebar-active-text)' : 'var(--sidebar-text)',
                background: active ? 'var(--sidebar-active-bg)' : 'transparent',
                borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                transition: 'all 0.12s',
              }}
            >
              <Icon size={15} strokeWidth={active ? 2.2 : 1.8} color={active ? 'var(--accent)' : 'var(--sidebar-muted)'} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Accounts */}
      {accounts.length > 0 && (
        <div style={{ margin: '0 10px 0', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--sidebar-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
            Accounts
          </div>
          {accounts.map((acc, i) => (
            <AccountDot key={acc.id} label={acc.name} color={ACCOUNT_COLORS[i % ACCOUNT_COLORS.length]} />
          ))}
        </div>
      )}

      {/* User + Sign Out */}
      <div style={{ margin: '8px 10px 14px', borderTop: '1px solid var(--sidebar-border)', paddingTop: 10 }}>
        {userEmail && (
          <div
            style={{
              fontSize: 11,
              color: 'var(--sidebar-muted)',
              padding: '0 4px 6px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={userEmail}
          >
            {userEmail}
          </div>
        )}
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 10px',
            borderRadius: 7,
            border: 'none',
            background: 'transparent',
            color: 'var(--sidebar-muted)',
            fontSize: 13,
            fontWeight: 500,
            cursor: signingOut ? 'not-allowed' : 'pointer',
            opacity: signingOut ? 0.5 : 1,
            transition: 'background 0.12s, color 0.12s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--sidebar-active-bg)'
            e.currentTarget.style.color = 'var(--danger)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--sidebar-muted)'
          }}
        >
          <LogOut size={14} strokeWidth={1.8} />
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </aside>
  )
}

const ACCOUNT_COLORS = ['#00B4B4', '#EC4899', '#8B5CF6', '#F59E0B', '#10B981', '#3B82F6']

function AccountDot({ label, color }: { label: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>{label}</span>
    </div>
  )
}
