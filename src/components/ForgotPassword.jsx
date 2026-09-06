import { useEffect, useRef, useState } from 'react'
import { KeyRound, Lock, Mail, MailCheck } from 'lucide-react'
import { supabase, errorMessage } from '../lib/supabase'
import { AuthShell } from './AuthShell'
import { Alert, Button, Field, PasswordInput, TextInput } from './ui'

const MIN_CODE_LENGTH = 6
const MAX_CODE_LENGTH = 10
const MIN_PASSWORD = 6
const RESEND_COOLDOWN = 60

/**
 * Locked-out recovery, by code rather than link.
 *
 * A reset link would open in the system browser, outside an installed PWA,
 * and land the user in a different session from the one they're staring at.
 * The code keeps the whole flow in-app.
 *
 * The code and the new password are collected on the SAME step on purpose:
 * verifyOtp() signs the user in the moment it succeeds, which would swap this
 * screen for the dashboard before a separate "set password" step could render.
 */
export function ForgotPassword({ initialEmail = '', onBack }) {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [cooldown, setCooldown] = useState(0)
  const codeRef = useRef(null)

  useEffect(() => {
    if (step === 2) codeRef.current?.focus()
  }, [step])

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown((c) => c - 1), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  async function sendCode(e) {
    e?.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)

    const address = email.trim()

    // resetPasswordForEmail() reports success for addresses it has never seen —
    // Supabase hides the difference so accounts can't be enumerated — which used
    // to march a typo'd address on to the code step to wait for a code that was
    // never sent. Ask the database outright instead.
    const { data: registered, error: lookupErr } = await supabase.rpc(
      'email_registered',
      { p_email: address },
    )

    if (!lookupErr && registered === false) {
      setBusy(false)
      setError('No account is registered with that email.')
      return
    }

    const { error: err } = await supabase.auth.resetPasswordForEmail(address)

    setBusy(false)
    if (err) {
      setError(errorMessage(err))
      return
    }
    // A lookup that failed outright (function not deployed, offline) still sends,
    // so a broken check can't lock anyone out of recovery — but then the account
    // was never confirmed, and the step-2 wording below has to stay hedged.
    setConfirmed(!lookupErr && registered === true)
    setStep(2)
    setCooldown(RESEND_COOLDOWN)
    setNotice(null)
  }

  async function handleReset(e) {
    e.preventDefault()

    if (code.length < MIN_CODE_LENGTH) return setError('Enter the code from your email.')
    if (next.length < MIN_PASSWORD)
      return setError(`New password must be at least ${MIN_PASSWORD} characters.`)
    if (next !== confirm) return setError("The passwords don't match.")

    setBusy(true)
    setError(null)

    const { error: otpErr } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code,
      type: 'recovery',
    })

    if (otpErr) {
      setError(errorMessage(otpErr, 'That code did not work.'))
      setCode('')
      setBusy(false)
      codeRef.current?.focus()
      return
    }

    const { error: updateErr } = await supabase.auth.updateUser({ password: next })

    if (updateErr) {
      setError(errorMessage(updateErr))
      setBusy(false)
      return
    }
    // Session is live and the password is changed — onAuthStateChange takes
    // over from here and drops them into the app.
  }

  return (
    <AuthShell
      title={step === 1 ? 'Reset your password' : 'Check your email'}
      subtitle={
        step === 1 ? (
          'We’ll email you a code to set a new one.'
        ) : (
          <>
            {confirmed ? 'We sent a code to ' : 'If an account exists for '}
            <span className="font-semibold text-hero-ink">{email}</span>
            {confirmed ? '. ' : ', a code is on its way. '}
            Enter it below with your new password.
          </>
        )
      }
      onBack={step === 2 ? () => setStep(1) : onBack}
      footer={
        step === 2 ? (
          cooldown > 0 ? (
            <>Didn&apos;t get it? You can resend in {cooldown}s</>
          ) : (
            <button
              type="button"
              onClick={sendCode}
              disabled={busy}
              className="font-semibold text-hero-ink underline underline-offset-2 disabled:opacity-50"
            >
              Resend code
            </button>
          )
        ) : null
      }
    >
      <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        {step === 1 ? <KeyRound size={24} /> : <MailCheck size={24} />}
      </span>

      {step === 1 ? (
        <form onSubmit={sendCode} className="flex flex-col gap-4">
          <Field label="Email">
            <TextInput
              icon={Mail}
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

          <Alert>{error}</Alert>

          <Button type="submit" busy={busy} className="mt-1">
            Send code
          </Button>
        </form>
      ) : (
        <form onSubmit={handleReset} className="flex flex-col gap-4">
          <Field label="Code from your email">
            <input
              ref={codeRef}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, '').slice(0, MAX_CODE_LENGTH))
                setError(null)
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Enter code"
              aria-label="Reset code"
              maxLength={MAX_CODE_LENGTH}
              className="w-full rounded-2xl border border-line bg-surface-2 py-3.5 text-center text-[24px] font-bold tracking-[0.25em] text-ink placeholder:text-[16px] placeholder:font-normal placeholder:tracking-normal placeholder:text-faint focus:border-brand focus:bg-surface"
            />
          </Field>

          <Field label="New password" hint={`At least ${MIN_PASSWORD} characters.`}>
            <PasswordInput
              icon={Lock}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              placeholder="••••••••"
              minLength={MIN_PASSWORD}
              required
            />
          </Field>

          <Field label="Confirm new password">
            <PasswordInput
              icon={Lock}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              placeholder="••••••••"
              minLength={MIN_PASSWORD}
              required
            />
          </Field>

          <Alert>{error}</Alert>
          <Alert tone="info">{notice}</Alert>

          <Button type="submit" busy={busy} className="mt-1">
            Set new password
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
