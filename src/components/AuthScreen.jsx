import { useState } from 'react'
import { Clock, Wallet } from 'lucide-react'
import { supabase, errorMessage } from '../lib/supabase'
import { Alert, Button, Field, TextInput } from './ui'

export function AuthScreen() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  const isSignUp = mode === 'signup'

  function switchMode() {
    setMode(isSignUp ? 'signin' : 'signup')
    setError(null)
    setNotice(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)

    const credentials = { email: email.trim(), password }
    const { data, error: err } = isSignUp
      ? await supabase.auth.signUp(credentials)
      : await supabase.auth.signInWithPassword(credentials)

    if (err) {
      setError(errorMessage(err))
      setBusy(false)
      return
    }

    // With email confirmation on, signUp returns a user but no session —
    // there's nothing to navigate to yet, so say so instead of hanging.
    if (isSignUp && !data.session) {
      setNotice(`Almost there — confirm your email at ${credentials.email}, then sign in.`)
      setMode('signin')
      setPassword('')
      setBusy(false)
      return
    }
    // On success onAuthStateChange swaps this screen out; leave busy = true.
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <header className="mb-8 text-center">
          <div className="mb-5 flex items-center justify-center gap-2">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-brand text-white shadow-card">
              <Clock size={22} />
            </span>
            <span className="flex size-11 items-center justify-center rounded-2xl bg-money-soft text-money shadow-card">
              <Wallet size={22} />
            </span>
          </div>
          <h1 className="text-[28px] font-bold tracking-tight">WorkBud</h1>
          <p className="mt-1.5 text-[15px] text-muted">
            Your OJT hours and daily spending, in one place.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Email">
            <TextInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              required
            />
          </Field>

          <Field
            label="Password"
            hint={isSignUp ? 'At least 6 characters.' : undefined}
          >
            <TextInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              minLength={6}
              required
            />
          </Field>

          <Alert>{error}</Alert>
          <Alert tone="info">{notice}</Alert>

          <Button type="submit" busy={busy} className="mt-1">
            {isSignUp ? 'Create account' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-6 text-center text-[14px] text-muted">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={switchMode}
            className="font-semibold text-brand"
          >
            {isSignUp ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  )
}
