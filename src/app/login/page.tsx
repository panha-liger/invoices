'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Mode = 'signin' | 'signup' | 'forgot'

export default function LoginPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [mode, setMode]               = useState<Mode>('signin')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [loading, setLoading]         = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError]             = useState('')
  const [message, setMessage]         = useState('')

  function switchMode(m: Mode) {
    setMode(m); setError(''); setMessage(''); setPassword(''); setConfirmPass('')
  }

  // ── Google ──
  async function handleGoogle() {
    setGoogleLoading(true); setError('')
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    setGoogleLoading(false)
  }

  // ── Sign In ──
  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(''); setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/dashboard')
  }

  // ── Sign Up ──
  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault(); setError(''); setMessage('')
    if (password !== confirmPass) { setError('Passwords do not match.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
    if (error) setError(error.message)
    else router.push('/dashboard')
  }

  // ── Forgot password ──
  async function handleForgot(e: React.FormEvent) {
    e.preventDefault(); setError(''); setMessage('')
    if (!email) { setError('Enter your email address above.'); return }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })
    setLoading(false)
    if (error) setError(error.message)
    else setMessage('Password reset link sent — check your email.')
  }

  const busy = loading || googleLoading

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div
        className="paper-card fade-in"
        style={{
          width: '100%',
          maxWidth: 400,
          borderRadius: 16,
          padding: '40px 36px',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Image src="/logo.png" alt="neWwave" width={44} height={44} style={{ borderRadius: 10, margin: '0 auto 12px' }} />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.025em' }}>
            neWwave Invoice Manager
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {mode === 'signin' ? 'Sign in to your account' : mode === 'signup' ? 'Create a new account' : 'Reset your password'}
          </p>
        </div>

        {/* Mode tabs (signin / signup) */}
        {mode !== 'forgot' && (
          <div style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: 9, padding: 3, marginBottom: 24, border: '1px solid var(--border)' }}>
            {(['signin', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                style={{
                  flex: 1,
                  padding: '7px 0',
                  borderRadius: 7,
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  background: mode === m ? 'var(--surface)' : 'transparent',
                  color: mode === m ? 'var(--text)' : 'var(--text-muted)',
                  boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {m === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>
        )}

        {/* Google button (not on forgot) */}
        {mode !== 'forgot' && (
          <>
            <button
              onClick={handleGoogle}
              disabled={busy}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid var(--border-2)',
                background: '#FFFFFF',
                color: '#1C1917',
                fontSize: 14,
                fontWeight: 500,
                cursor: busy ? 'not-allowed' : 'pointer',
                opacity: busy ? 0.6 : 1,
                transition: 'box-shadow 0.15s',
              }}
              onMouseEnter={e => { if (!busy) e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
            >
              {googleLoading
                ? <Spinner color="var(--text-muted)" />
                : <GoogleIcon />}
              {googleLoading ? 'Redirecting…' : 'Continue with Google'}
            </button>

            <Divider />
          </>
        )}

        {/* ── Sign In form ── */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
            <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />

            <Feedback error={error} message={message} />

            <SubmitButton loading={loading} busy={busy} label="Sign In" loadingLabel="Signing in…" />

            <button type="button" onClick={() => switchMode('forgot')} style={linkBtn}>
              Forgot password?
            </button>
          </form>
        )}

        {/* ── Sign Up form ── */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
            <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="Min. 6 characters" />
            <Field label="Confirm Password" type="password" value={confirmPass} onChange={setConfirmPass} placeholder="Repeat password" />

            <Feedback error={error} message={message} />

            <SubmitButton loading={loading} busy={busy} label="Create Account" loadingLabel="Creating…" />
          </form>
        )}

        {/* ── Forgot password form ── */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />

            <Feedback error={error} message={message} />

            <SubmitButton loading={loading} busy={busy} label="Send Reset Link" loadingLabel="Sending…" />

            <button type="button" onClick={() => switchMode('signin')} style={linkBtn}>
              ← Back to sign in
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ──

function Field({ label, type, value, onChange, placeholder }: {
  label: string; type: string; value: string
  onChange: (v: string) => void; placeholder: string
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required
        style={{ width: '100%', padding: '9px 12px', borderRadius: 7, border: '1px solid var(--border)', color: 'var(--text)', fontSize: 14, outline: 'none', transition: 'border-color 0.15s' }}
        onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
        onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
      />
    </div>
  )
}

function Feedback({ error, message }: { error: string; message: string }) {
  if (!error && !message) return null
  return (
    <div style={{
      padding: '9px 13px', borderRadius: 7, fontSize: 13,
      background: error ? '#FEF2F2' : '#F0FDF4',
      border: `1px solid ${error ? '#FECACA' : '#BBF7D0'}`,
      color: error ? '#B91C1C' : '#15803D',
    }}>
      {error || message}
    </div>
  )
}

function SubmitButton({ loading, busy, label, loadingLabel }: {
  loading: boolean; busy: boolean; label: string; loadingLabel: string
}) {
  return (
    <button
      type="submit"
      disabled={busy}
      style={{
        width: '100%', padding: '10px 16px', borderRadius: 8, border: 'none',
        background: '#1C1917', color: '#FFFFFF', fontSize: 14, fontWeight: 600,
        cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        marginTop: 2,
      }}
    >
      {loading ? <><Spinner color="rgba(255,255,255,0.7)" /> {loadingLabel}</> : label}
    </button>
  )
}

function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>or continue with email</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  )
}

function Spinner({ color }: { color: string }) {
  return (
    <span style={{
      width: 15, height: 15,
      border: `2px solid ${color}`,
      borderTopColor: 'transparent',
      borderRadius: '50%',
      display: 'inline-block',
      animation: 'spin 0.7s linear infinite',
      flexShrink: 0,
    }} />
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-3.59-13.46-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}

const linkBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: 'var(--text-muted)',
  fontSize: 13, cursor: 'pointer', textAlign: 'center', padding: '4px 0',
  textDecoration: 'underline', textDecorationColor: 'transparent',
  transition: 'color 0.15s',
}
