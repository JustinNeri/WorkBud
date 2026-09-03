import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, KeyRound, MailCheck } from 'lucide-react'
import { supabase, errorMessage } from '../lib/supabase'
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

    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim())

    setBusy(false)
    if (err) {
      setError(errorMessage(err))
      return
    }
    // Supabase answers the same way whether or not the address exists, so the
    // wording here must not imply the account was found.
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
    <div className="flex min-h-dvh flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <button
          type="button"
          onClick={step === 2 ? () => setStep(1) : onBack}
          className="mb-6 inline-flex items-center gap-1.5 text-[14px] font-medium text-muted"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <header className="mb-7">
          <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            {step === 1 ? <KeyRound size={24} /> : <MailCheck size={24} />}
          </span>
          <h1 className="text-[24px] font-bold tracking-tight">
            {step === 1 ? 'Reset your password' : 'Check your email'}
          </h1>
          <p className="mt-1.5 text-[14.5px] leading-snug text-muted">
            {step === 1 ? (
              'We’ll email you a code to set a new one.'
            ) : (
              <>
                If an account exists for{' '}
                <span className="font-medium text-ink">{email}</span>, a code is on
                its way. Enter it below with your new password.
              </>
            )}
          </p>
        </header>

        {step === 1 ? (
          <form onSubmit={sendCode} className="flex flex-col gap-4">
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
                className="w-full rounded-xl border border-line bg-surface-2 py-3.5 text-center text-[24px] font-semibold tracking-[0.25em] text-ink placeholder:text-[16px] placeholder:tracking-normal placeholder:text-faint focus:border-brand focus:bg-surface"
              />
            </Field>

            <Field label="New password" hint={`At least ${MIN_PASSWORD} characters.`}>
              <PasswordInput
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

            <p className="text-center text-[14px] text-muted">
              {cooldown > 0 ? (
                <>Didn&apos;t get it? Resend in {cooldown}s</>
              ) : (
                <button
                  type="button"
                  onClick={sendCode}
                  disabled={busy}
                  className="font-semibold text-brand disabled:opacity-50"
                >
                  Resend code
                </button>
              )}
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
