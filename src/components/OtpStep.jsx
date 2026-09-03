import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, MailCheck } from 'lucide-react'
import { supabase, errorMessage } from '../lib/supabase'
import { Alert, Button } from './ui'

// Supabase's OTP length is a project setting (6–10 digits), so don't assume
// one — accept the whole range and let the server reject a wrong code.
const MIN_CODE_LENGTH = 6
const MAX_CODE_LENGTH = 10
const RESEND_COOLDOWN = 60

/**
 * Second signup step: the numeric code Supabase mailed out.
 * Requires the "Confirm signup" email template to contain {{ .Token }}.
 */
export function OtpStep({ email, onBack }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN)
  const inputRef = useRef(null)
  const submittedFor = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown((c) => c - 1), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  async function verify(value) {
    // Guard the auto-submit so one code isn't sent twice.
    if (submittedFor.current === value) return
    submittedFor.current = value

    setBusy(true)
    setError(null)
    setNotice(null)

    const { error: err } = await supabase.auth.verifyOtp({
      email,
      token: value,
      type: 'signup',
    })

    if (err) {
      setError(errorMessage(err, 'That code did not work.'))
      setCode('')
      setBusy(false)
      submittedFor.current = null
      inputRef.current?.focus()
      return
    }
    // Success: onAuthStateChange swaps in the dashboard. Stay busy.
  }

  // No auto-submit: the code length varies by project, so there's no reliable
  // "it's complete now" moment. The user taps Verify.
  function handleChange(e) {
    setCode(e.target.value.replace(/\D/g, '').slice(0, MAX_CODE_LENGTH))
    setError(null)
  }

  async function handleResend() {
    setBusy(true)
    setError(null)
    setNotice(null)

    const { error: err } = await supabase.auth.resend({ type: 'signup', email })

    setBusy(false)
    if (err) {
      setError(errorMessage(err))
      return
    }
    setNotice('New code sent.')
    setCooldown(RESEND_COOLDOWN)
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-1.5 text-[14px] font-medium text-muted"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <header className="mb-7 text-center">
          <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <MailCheck size={24} />
          </span>
          <h1 className="text-[22px] font-bold tracking-tight">Check your email</h1>
          <p className="mt-1.5 text-[15px] leading-snug text-muted">
            We sent a verification code to{' '}
            <span className="font-medium text-ink">{email}</span>
          </p>
        </header>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (code.length >= MIN_CODE_LENGTH) verify(code)
          }}
          className="flex flex-col gap-4"
        >
          <input
            ref={inputRef}
            value={code}
            onChange={handleChange}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="Enter code"
            aria-label="Verification code"
            maxLength={MAX_CODE_LENGTH}
            disabled={busy}
            className="w-full rounded-xl border border-line bg-surface-2 py-4 text-center text-[28px] font-semibold tracking-[0.25em] text-ink placeholder:text-[18px] placeholder:tracking-normal placeholder:text-faint focus:border-brand focus:bg-surface disabled:opacity-60"
          />

          <Alert>{error}</Alert>
          <Alert tone="info">{notice}</Alert>

          <Button
            type="submit"
            busy={busy}
            disabled={code.length < MIN_CODE_LENGTH}
          >
            Verify
          </Button>
        </form>

        <p className="mt-6 text-center text-[14px] text-muted">
          {cooldown > 0 ? (
            <>Didn&apos;t get it? Resend in {cooldown}s</>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={busy}
              className="font-semibold text-brand disabled:opacity-50"
            >
              Resend code
            </button>
          )}
        </p>
      </div>
    </div>
  )
}
