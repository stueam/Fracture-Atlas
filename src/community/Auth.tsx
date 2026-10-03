import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { client, configurationError, errorMessage, initializeAuth, safeReturn } from './client'

interface AuthState {
  session: Session | null
  loading: boolean
  reviewer: boolean
  error: string
  refresh: () => void
}
const Context = createContext<AuthState>({
  session: null,
  loading: true,
  reviewer: false,
  error: '',
  refresh: () => {},
})
export const useAuth = () => useContext(Context)
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(Boolean(client))
  const [reviewer, setReviewer] = useState(false)
  const [error, setError] = useState(configurationError)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let alive = true
    const subscription = client?.auth.onAuthStateChange((_event, next) => {
      if (alive) setSession(next)
    })
    initializeAuth()
      .then(async (message) => {
        if (message && alive) setError(message)
        const result = await client?.auth.getSession()
        if (alive) {
          setSession(result?.data.session ?? null)
          setLoading(false)
        }
      })
      .catch((e) => {
        if (alive) {
          setError(errorMessage(e))
          setLoading(false)
        }
      })
    return () => {
      alive = false
      subscription?.data.subscription.unsubscribe()
    }
  }, [])
  useEffect(() => {
    let alive = true
    setReviewer(false)
    if (session && client)
      client.rpc('is_reviewer').then(({ data, error }) => {
        if (alive) {
          setReviewer(!error && data === true)
          if (error) setError('Account permissions could not be loaded. Retry below.')
        }
      })
    return () => {
      alive = false
    }
  }, [session, tick])
  return (
    <Context.Provider
      value={{
        session,
        loading,
        reviewer,
        error,
        refresh: () => {
          setError('')
          setTick((x) => x + 1)
        },
      }}
    >
      {children}
    </Context.Provider>
  )
}
export function ConnectionNotice() {
  return !client ? (
    <div className="community-notice" role="status">
      <strong>Submissions are not open yet.</strong> You can explore the form. Online saving,
      sign-in and review will be available after the community service is connected. Nothing entered
      here is published.
    </div>
  ) : null
}
export function Account() {
  const { session, reviewer, loading, error, refresh } = useAuth()
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [factor, setFactor] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [mfaReady, setMfaReady] = useState(false)
  useEffect(() => {
    if (!session || !client) return
    client.auth.mfa
      .getAuthenticatorAssuranceLevel()
      .then(({ data }) => setMfaReady(data?.currentLevel === 'aal2'))
  }, [session])
  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setMessage('')
    try {
      await fn()
    } catch (e) {
      setMessage(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  async function login() {
    try {
      sessionStorage.setItem(
        'atlas-return',
        safeReturn(new URLSearchParams(location.hash.split('?')[1]).get('next')),
      )
    } catch {
      /* optional return */
    }
    const { error } = await client!.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: new URL(import.meta.env.BASE_URL, location.origin).href },
    })
    if (error) throw error
  }
  async function setupMfa() {
    const { data, error } = await client!.auth.mfa.listFactors()
    if (error) throw error
    const verified = data.totp.find((x) => x.status === 'verified')
    if (verified) {
      setFactor(verified.id)
      return
    }
    for (const old of data.all.filter((x) => x.factor_type === 'totp' && x.status === 'unverified'))
      await client!.auth.mfa.unenroll({ factorId: old.id })
    const enrolled = await client!.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Fracture Atlas review',
    })
    if (enrolled.error) throw enrolled.error
    setFactor(enrolled.data.id)
    setSecret(enrolled.data.totp.secret)
  }
  return (
    <section className="community-page">
      <div className="community-heading">
        <span className="eyebrow">Your workspace</span>
        <h1>Account</h1>
        <p>Save contributions, track feedback, and manage review access.</p>
      </div>
      <ConnectionNotice />
      {error && (
        <div className="community-error" role="alert">
          {error} <button onClick={refresh}>Retry permissions</button>
        </div>
      )}
      {message && (
        <div className="community-notice" role="status">
          {message}
        </div>
      )}
      <div className="community-card">
        {loading ? (
          <p>Loading account…</p>
        ) : session ? (
          <>
            <h2>Signed in</h2>
            <p>{session.user.email || 'GitHub account'}</p>
            <div className="community-actions">
              <a className="button primary" href="#/account/submissions">
                My submissions
              </a>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const { error } = await client!.auth.signOut()
                    if (error) throw error
                    setSecret('')
                    setFactor('')
                  })
                }
              >
                Sign out
              </button>
            </div>
          </>
        ) : (
          <>
            <h2>Continue with GitHub</h2>
            <p>
              Use your GitHub account to submit research. We do not request repository write access.
            </p>
            <button
              className="button primary"
              disabled={!client || busy}
              onClick={() => run(login)}
            >
              Sign in with GitHub
            </button>
          </>
        )}
      </div>
      {session && reviewer && (
        <div className="community-card">
          <h2>Review access</h2>
          <p>
            A second authentication factor is required to read private submissions and make
            decisions.
          </p>
          {mfaReady ? (
            <a href="#/admin/reviews" className="button primary">
              Open review queue
            </a>
          ) : (
            <button disabled={busy} className="button secondary" onClick={() => run(setupMfa)}>
              Verify with authenticator
            </button>
          )}
          {factor && !mfaReady && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                run(async () => {
                  const { error } = await client!.auth.mfa.challengeAndVerify({
                    factorId: factor,
                    code,
                  })
                  if (error) throw error
                  setSecret('')
                  setCode('')
                  setMfaReady(true)
                  refresh()
                })
              }}
            >
              {secret && (
                <p>
                  Add this setup key to your authenticator:{' '}
                  <code className="setup-key">{secret}</code>
                </p>
              )}
              <label className="community-field">
                Six-digit code
                <input
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </label>
              <button className="button primary" disabled={busy}>
                Verify
              </button>
            </form>
          )}
        </div>
      )}
    </section>
  )
}
