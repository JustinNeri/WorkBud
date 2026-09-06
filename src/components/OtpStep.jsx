import { useEffect, useRef, useState } from 'react'
import { MailCheck } from 'lucide-react'
import { supabase, errorMessage } from '../lib/supabase'
import { AuthShell } from './AuthShell'
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
    <AuthShell
      title="Check your email"
      subtitle={
        <>
          We sent a verification code to{' '}
          <span className="font-semibold text-hero-ink">{email}</span>
        </>
      }
      step={2}
      onBack={onBack}
      footer={
        cooldown > 0 ? (
          <>Didn&apos;t get it? You can resend in {cooldown}s</>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={busy}
            className="font-semibold text-hero-ink underline underline-offset-2 disabled:opacity-50"
          >
            Resend code
          </button>
        )
      }
    >
      <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <MailCheck size={24} />
      </span>

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
          className="w-full rounded-2xl border border-line bg-surface-2 py-4 text-center text-[28px] font-bold tracking-[0.25em] text-ink placeholder:text-[17px] placeholder:font-normal placeholder:tracking-normal placeholder:text-faint focus:border-brand focus:bg-surface disabled:opacity-60"
        />

        <Alert>{error}</Alert>
        <Alert tone="info">{notice}</Alert>

        <Button type="submit" busy={busy} disabled={code.length < MIN_CODE_LENGTH}>
          Verify
        </Button>
      </form>
    </AuthShell>
  )
}
