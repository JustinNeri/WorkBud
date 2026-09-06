import { useState } from 'react'
import { ArrowRight, Check, Loader2, Lock, Mail, Sparkles } from 'lucide-react'
import { supabase, errorMessage } from '../lib/supabase'
import { evaluatePassword } from '../lib/password'
import { AuthShell } from './AuthShell'
import { ForgotPassword } from './ForgotPassword'
import { OtpStep } from './OtpStep'
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
    <AuthShell
      badge={
        <>
          <Sparkles size={12} />
          {isSignUp ? 'Free — about a minute' : 'OJT + spending, together'}
        </>
      }
      title={isSignUp ? 'Create your account' : 'Welcome back'}
      subtitle={
        isSignUp
          ? 'Set up once, then every shift, receipt and remaining hour lands in one place.'
          : 'Sign in to pick up where you left off.'
      }
      step={isSignUp ? 1 : null}
      footer={
        isSignUp ? (
          <>
            We&apos;ll email you a verification code next. That code and password
            resets are the only mail WorkBud sends.
          </>
        ) : null
      }
    >
      {/* Two named destinations, not one form with a swapped button. */}
      <div
        role="tablist"
        aria-label="Sign in or create an account"
        className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1"
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

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {/* The status lines sit outside <Field> on purpose: Field renders a
            <label>, and a button nested in one has its clicks forwarded to
            the input as well. */}
        <div>
          <Field label="Email">
            <TextInput
              icon={Mail}
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
              icon={Lock}
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
                icon={Lock}
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
    </AuthShell>
  )
}
