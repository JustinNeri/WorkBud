import { useState } from 'react'
import { ArrowRight, Clock, Sparkles, Wallet } from 'lucide-react'
import { supabase, errorMessage } from '../lib/supabase'
import { ForgotPassword } from './ForgotPassword'
import { OtpStep } from './OtpStep'
import { Alert, Button, Field, PasswordInput, TextInput } from './ui'

export function AuthScreen() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  // Set once signUp has mailed a code; swaps this screen for the OTP step.
  const [awaitingCode, setAwaitingCode] = useState(null)
  const [resetting, setResetting] = useState(false)

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
      // An abandoned signup leaves an auth.users row behind, and signing into
      // it lands here. Quietly mailing a fresh code and jumping to the OTP
      // screen turned a sign-in attempt into a half-finished signup, which is
      // not what anyone pressing "Sign in" asked for. Say what happened and
      // let them pick Sign up, which mails a new code on its own.
      if (err.code === 'email_not_confirmed') {
        setError(
          'That email isn’t registered yet — the signup was never finished. Tap Sign up to complete it.',
        )
        setBusy(false)
        return
      }

      // "Invalid login credentials" covers both an unknown address and a wrong
      // password. The reset screen can already tell those apart, so use the
      // same lookup here instead of making them guess which one it was.
      if (!isSignUp && err.code === 'invalid_credentials') {
        const { data: registered, error: lookupErr } = await supabase.rpc(
          'email_registered',
          { p_email: credentials.email },
        )

        if (lookupErr) setError(errorMessage(err))
        else if (registered === false)
          setError('No account is registered with that email.')
        else setError('Incorrect password.')

        setBusy(false)
        return
      }

      setError(errorMessage(err))
      setBusy(false)
      return
    }

    if (isSignUp && !data.session) {
      // Signing up an address that already has an account returns success with
      // a decoy user — Supabase hides the difference so outsiders can't probe
      // which emails are registered. An empty identities array is the only
      // tell, and no code is sent, so don't strand them on the OTP screen.
      if (data.user?.identities?.length === 0) {
        setError('That email is already registered. Sign in instead.')
        setBusy(false)
        return
      }

      // A real new signup: the code is in their inbox.
      setAwaitingCode(credentials.email)
      setPassword('')
      setBusy(false)
      return
    }
    // On success onAuthStateChange swaps this screen out; leave busy = true.
  }

  if (awaitingCode) {
    return <OtpStep email={awaitingCode} onBack={() => setAwaitingCode(null)} />
  }

  if (resetting) {
    return (
      <ForgotPassword
        initialEmail={email.trim()}
        onBack={() => setResetting(false)}
      />
    )
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      {/* Brand panel: the gradient does the work the old centred form didn't. */}
      <div className="relative overflow-hidden bg-hero px-6 pt-[max(3rem,env(safe-area-inset-top))] pb-16 text-hero-ink">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 -left-20 size-56 rounded-full bg-white/10 blur-2xl"
        />

        <div className="relative mx-auto w-full max-w-sm">
          <span className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[12px] font-semibold">
            <Sparkles size={13} />
            OJT + spending, together
          </span>

          <h1 className="text-[34px] font-bold leading-[1.1] tracking-tight">
            WorkBud
          </h1>
          <p className="mt-2 max-w-[19rem] text-[15px] leading-snug opacity-85">
            Track the hours you owe and the money you spend getting them — in one
            place.
          </p>

          <div className="mt-6 flex gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-2.5 py-1.5 text-[12.5px] font-semibold">
              <Clock size={14} />
              Hours
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-2.5 py-1.5 text-[12.5px] font-semibold">
              <Wallet size={14} />
              Budget
            </span>
          </div>
        </div>
      </div>

      {/* Form card overlapping the panel — the shape that stops it reading flat. */}
      <div className="relative -mt-8 flex-1 rounded-t-3xl bg-canvas px-6 pt-7 pb-12">
        <div className="mx-auto w-full max-w-sm">
          <h2 className="text-[21px] font-bold tracking-tight">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="mt-1 mb-6 text-[14px] text-muted">
            {isSignUp
              ? 'A minute to set up, then you never lose a day again.'
              : 'Sign in to pick up where you left off.'}
          </p>

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
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                minLength={6}
                required
              />
            </Field>

            {!isSignUp ? (
              <button
                type="button"
                onClick={() => setResetting(true)}
                className="-mt-2 self-end text-[13px] font-semibold text-brand"
              >
                Forgot password?
              </button>
            ) : null}

            <Alert>{error}</Alert>
            <Alert tone="info">{notice}</Alert>

            <Button type="submit" busy={busy} className="mt-1">
              {isSignUp ? 'Create account' : 'Sign in'}
              <ArrowRight size={17} />
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
    </div>
  )
}
