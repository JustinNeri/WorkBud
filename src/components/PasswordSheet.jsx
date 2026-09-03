import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { supabase, errorMessage } from '../lib/supabase'
import { Sheet } from './Sheet'
import { Alert, Button, Field, PasswordInput } from './ui'

const MIN_LENGTH = 6

/**
 * Change password.
 *
 * supabase.auth.updateUser() will set a new password on the strength of the
 * session alone — it never asks for the current one. On a phone someone else
 * has picked up, that's an account takeover. So the current password is
 * verified with a sign-in first, and only then is the change applied.
 */
export function PasswordSheet({ open, email, onClose }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()

    if (next.length < MIN_LENGTH)
      return setError(`New password must be at least ${MIN_LENGTH} characters.`)
    if (next !== confirm) return setError("The new passwords don't match.")
    if (next === current)
      return setError('That is already your password. Pick a different one.')

    setBusy(true)
    setError(null)

    // Step 1 — prove they know the current password. Signing in as the same
    // user just refreshes the session, so there's nothing to undo on failure.
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email,
      password: current,
    })

    if (authErr) {
      setError(
        authErr.code === 'invalid_credentials'
          ? 'Current password is incorrect.'
          : errorMessage(authErr),
      )
      setBusy(false)
      return
    }

    // Step 2 — apply the change.
    const { error: updateErr } = await supabase.auth.updateUser({ password: next })

    if (updateErr) {
      setError(errorMessage(updateErr))
      setBusy(false)
      return
    }

    setDone(true)
    setBusy(false)
    setCurrent('')
    setNext('')
    setConfirm('')
  }

  return (
    <Sheet open={open} onClose={onClose} title="Change password">
      {done ? (
        <div className="py-2 text-center">
          <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-money-soft text-money">
            <KeyRound size={22} />
          </span>
          <p className="text-[15px] font-semibold">Password updated</p>
          <p className="mt-1 mb-5 text-[13px] leading-snug text-muted">
            Use the new one next time you sign in. You&apos;re still signed in here.
          </p>
          <Button onClick={onClose}>Done</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Current password">
            <PasswordInput
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              required
            />
          </Field>

          <Field label="New password" hint={`At least ${MIN_LENGTH} characters.`}>
            <PasswordInput
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              placeholder="••••••••"
              minLength={MIN_LENGTH}
              required
            />
          </Field>

          <Field label="Confirm new password">
            <PasswordInput
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              placeholder="••••••••"
              minLength={MIN_LENGTH}
              required
            />
          </Field>

          <Alert>{error}</Alert>

          <Button type="submit" busy={busy} className="mt-1">
            Update password
          </Button>
        </form>
      )}
    </Sheet>
  )
}
