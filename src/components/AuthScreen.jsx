import { useState } from 'react'
import {
  ArrowRight,
  Check,
  Clock,
  Loader2,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { supabase, errorMessage } from '../lib/supabase'
import { evaluatePassword } from '../lib/password'
import { ForgotPassword } from './ForgotPassword'
import { OtpStep } from './OtpStep'
import { SignupSteps } from './SignupSteps'
import { Alert, Button, Field, PasswordInput, PasswordMeter, TextInput } from './ui'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function AuthScreen() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  // null | { status: 'checking' | 'taken' | 'free', email }
  const [emailState, setEmailState] = useState(null)
  // Set once signUp has mailed a code; swaps this screen for the OTP step.
  const [awaitingCode, setAwaitingCode] = useState(null)
  const [resetting, setResetting] = useState(false)

  const isSignUp = mode === 'signup'
  const strength = evaluatePassword(password, email)
  const mismatch = confirm.length > 0 && confirm !== password

  function selectMode(next) {
    if (next === mode) return
    setMode(next)
    setPassword('')
    setConfirm('')
    setError(null)
    setNotice(null)
    setEmailState(null)
  }

  function handleEmailChange(e) {
    setEmail(e.target.value)
    setEmailState(null)
    setError(null)
  }

  /**
   * Signup only: ask whether the address already has an account the moment
   * they leave the field, instead of letting them pick a password, wait for a
   * code, and only then be told to go and sign in.
   */
  async function checkEmail() {
    if (!isSignUp) return

    const address = email.trim()
    if (!EMAIL_RE.test(address)) return

    setEmailState({ status: 'checking', email: address })

    const { data, error: err } = await supabase.rpc('email_registered', {
      p_email: address,
    })

    // A lookup that fails outright shouldn't block signup — submit still
    // catches an existing account from signUp()'s own response.
    if (err) return setEmailState(null)

    setEmailState({ status: data === true ? 'taken' : 'free', email: address })
  }

  function switchToSignIn() {
    selectMode('signin')
    setNotice('You already have an account — sign in with your password.')
  }

  async function handleSubmit(e) {
    e.preventDefault()

    const address = email.trim()

    // The form is noValidate, so the browser's own bubbles never fire and
    // every message below is one this screen wrote.
    if (!EMAIL_RE.test(address)) return setError('Enter a valid email address.')
    if (!password) return setError('Enter your password.')

    // The rest is signup-only, and checked here rather than left to the
    // server: every round trip costs an email, and "Password should be at
    // least 6 characters" thrown back by Supabase is a worse answer than the
    // live checklist the user was already looking at.
    if (isSignUp) {
      if (emailState?.status === 'taken' && emailState.email === address)
        return setError('That email is already registered. Switch to Sign in.')
      if (!strength.met)
        return setError(
          strength.problem || 'Your password does not meet the rules below yet.',
        )
      if (password !== confirm) return setError("The passwords don't match.")
    }

    setBusy(true)
    setError(null)
    setNotice(null)

    const credentials = { email: address, password }
    const { data, error: err } = isSignUp
      ? await supabase.auth.signUp(credentials)
      : await supabase.auth.signInWithPassword(credentials)

    if (err) {
      // An abandoned signup leaves an auth.users row behind, and signing into
      // it lands here. Quietly mailing a fresh code and jumping to the OTP
      // screen turned a sign-in attempt into a half-finished signup, which is
      // not what anyone pressing "Sign in" asked for. Say what happened and
      // let them pick Create account, which mails a new code on its own.
      if (err.code === 'email_not_confirmed') {
        setError(
          'That email isn’t registered yet — the signup was never finished. Tap Create account to complete it.',
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
        setError('That email is already registered. Switch to Sign in.')
        setEmailState({ status: 'taken', email: address })
        setBusy(false)
        return
      }

      // A real new signup: the code is in their inbox.
      setAwaitingCode(credentials.email)
      setPassword('')
      setConfirm('')
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

  const trimmed = email.trim()
  const checking = emailState?.status === 'checking'
  const taken = emailState?.status === 'taken' && emailState.email === trimmed
  const available = emailState?.status === 'free' && emailState.email === trimmed

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
            {isSignUp ? 'Free — about a minute' : 'OJT + spending, together'}
          </span>

          <h1 className="text-[34px] font-bold leading-[1.1] tracking-tight">
            WorkBud
          </h1>
          <p className="mt-2 max-w-[19rem] text-[15px] leading-snug opacity-85">
            {isSignUp
              ? 'Set up once, then every shift, receipt and remaining hour lands in one place.'
              : 'Track the hours you owe and the money you spend getting them — in one place.'}
          </p>

          {isSignUp ? (
            /* Signup gets the roadmap instead of the feature chips: the code
               and the setup form are the part people don't see coming. */
            <div className="mt-6">
              <SignupSteps current={1} tone="hero" />
            </div>
          ) : (
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
          )}
        </div>
      </div>

      {/* Form card overlapping the panel — the shape that stops it reading flat. */}
      <div className="relative -mt-8 flex-1 rounded-t-3xl bg-canvas px-6 pt-7 pb-12">
        <div className="mx-auto w-full max-w-sm">
          {/* Two named destinations, not one form with a swapped button. */}
          <div
            role="tablist"
            aria-label="Sign in or create an account"
            className="mb-6 grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1"
          >
            {[
              ['signin', 'Sign in'],
              ['signup', 'Create account'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                onClick={() => selectMode(value)}
                className={`h-10 rounded-xl text-[14px] font-semibold transition ${
                  mode === value
                    ? 'bg-surface text-ink shadow-card'
                    : 'text-muted active:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <h2 className="text-[21px] font-bold tracking-tight">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="mt-1 mb-6 text-[14px] text-muted">
            {isSignUp
              ? 'Start with an email and a password — the rest comes next.'
              : 'Sign in to pick up where you left off.'}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {/* The status lines sit outside <Field> on purpose: Field renders a
                <label>, and a button nested in one has its clicks forwarded to
                the input as well. */}
            <div>
              <Field label="Email">
                <TextInput
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={checkEmail}
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-invalid={taken || undefined}
                  required
                />
              </Field>
              {isSignUp && checking ? (
                <span className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] text-faint">
                  <Loader2 size={12} className="animate-spin" />
                  Checking this email…
                </span>
              ) : null}
              {isSignUp && available ? (
                <span className="mt-1.5 inline-flex items-center gap-1 text-[12px] text-money">
                  <Check size={12} strokeWidth={3} />
                  That email is free to use.
                </span>
              ) : null}
              {isSignUp && taken ? (
                <span className="mt-1.5 block text-[12px] leading-snug text-over">
                  Already registered.{' '}
                  <button
                    type="button"
                    onClick={switchToSignIn}
                    className="font-semibold text-brand underline underline-offset-2"
                  >
                    Sign in instead
                  </button>
                </span>
              ) : null}
            </div>

            <div>
              <Field label={isSignUp ? 'Choose a password' : 'Password'}>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  required
                />
              </Field>
              {isSignUp ? <PasswordMeter result={strength} /> : null}
            </div>

            {isSignUp ? (
              <div>
                <Field label="Confirm password">
                  <PasswordInput
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    aria-invalid={mismatch || undefined}
                    required
                  />
                </Field>
                {mismatch ? (
                  <span className="mt-1.5 block text-[12px] text-over">
                    These don&apos;t match yet.
                  </span>
                ) : null}
                {confirm.length > 0 && !mismatch ? (
                  <span className="mt-1.5 inline-flex items-center gap-1 text-[12px] text-money">
                    <Check size={12} strokeWidth={3} />
                    Passwords match.
                  </span>
                ) : null}
              </div>
            ) : null}

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

          {isSignUp ? (
            <p className="mt-4 text-center text-[12.5px] leading-snug text-faint">
              We&apos;ll email you a verification code next. That code and
              password resets are the only mail WorkBud sends.
            </p>
          ) : (
            <p className="mt-6 text-center text-[14px] text-muted">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => selectMode('signup')}
                className="font-semibold text-brand"
              >
                Create one
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
