import { createClient } from '@supabase/supabase-js'
import { backendConfigured } from './config'

const url = import.meta.env.VITE_SUPABASE_URL || ''
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''
function publicKey(value: string) {
  if (value.startsWith('sb_publishable_')) return true
  try {
    return (
      JSON.parse(atob(value.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role === 'anon'
    )
  } catch {
    return false
  }
}
export const configurationError =
  backendConfigured && (!/^https:\/\//.test(url) || !publicKey(key))
    ? 'Community connection is not configured with a valid public URL and publishable key.'
    : ''
export const client =
  backendConfigured && !configurationError
    ? createClient(url, key, {
        auth: {
          flowType: 'pkce',
          detectSessionInUrl: false,
          persistSession: true,
          storageKey: 'fracture-atlas-auth',
        },
      })
    : null

export function safeReturn(value: string | null) {
  return value &&
    /^\/(submit|submissions|account|admin|community)(\/|\?|$)/.test(value) &&
    !value.includes('://')
    ? value
    : '/account'
}
let boot: Promise<string> | undefined
export function initializeAuth() {
  if (boot) return boot
  boot = (async () => {
    const query = new URLSearchParams(location.search)
    const code = query.get('code')
    const oauthError = query.get('error_description') || query.get('error')
    if (!code && !oauthError) return ''
    history.replaceState(null, '', `${location.pathname}${location.hash}`)
    if (oauthError) {
      location.hash = '/account'
      return `Sign-in was not completed: ${oauthError.slice(0, 200)}`
    }
    if (!client) return 'Sign-in connection is not configured.'
    const { error } = await client.auth.exchangeCodeForSession(code!)
    let next = '/account'
    try {
      next = safeReturn(sessionStorage.getItem('atlas-return'))
      sessionStorage.removeItem('atlas-return')
    } catch {
      /* storage may be restricted */
    }
    location.hash = error ? '/account' : next
    return error ? 'Sign-in expired or was started in another browser. Please sign in again.' : ''
  })()
  return boot
}

export async function rpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!client) throw new Error('Online submissions are not connected yet.')
  const { data, error } = await client.rpc(name, args)
  if (error) throw new Error(error.message)
  return data as T
}
export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Request failed. Please try again.'
}
