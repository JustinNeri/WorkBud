import { useState } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { supabase, errorMessage } from '../lib/supabase'
import { removeAllAvatars } from '../lib/avatar'
import { Sheet } from './Sheet'
import { Alert, Button, Field, PasswordInput } from './ui'

/** Per-device leftovers keyed by job id, which mean nothing once the jobs are gone. */
function clearLocalLeftovers() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('wb-nudge-')) localStorage.removeItem(key)
    }
  } catch {
    /* storage unavailable, nothing to clear */
  }
}

/**
 * Delete account.
 *
 * The same rule as changing the password: the session alone is not enough. A
 * phone left unlocked on a desk should not be one tap away from wiping someone's
 * whole placement record, so the current password is checked with a sign-in
 * before anything is removed.
 *
 * Order matters. The avatar files go first, because once the auth user is gone
 * the storage policies no longer recognise anyone as their owner and they would
 * be stranded on a public URL. Then DELETE /api/account removes the auth user,
 * and the database cascades everything else.
 */
export function DeleteAccountSheet({ open, userId, email, onClose }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)

    const { error: authErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (authErr) {
      setError(
        authErr.code === 'invalid_credentials'
          ? 'That password is incorrect.'
          : errorMessage(authErr),
      )
      setBusy(false)
      return
    }

    const { error: photoErr } = await removeAllAvatars(userId)
    if (photoErr) {
      setError(photoErr)
      setBusy(false)
      return
    }

    const { error: delErr } = await api.delete('/account')
    if (delErr) {
      setError(errorMessage(delErr))
      setBusy(false)
      return
    }

    clearLocalLeftovers()
    // Local only: the user no longer exists, so asking the server to revoke
    // the session would just fail. Dropping the token is what returns the app
    // to the sign-in screen.
    await supabase.auth.signOut({ scope: 'local' })
  }

  return (
    <Sheet open={open} onClose={busy ? () => {} : onClose} title="Delete account">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex items-start gap-2.5 rounded-2xl bg-over-soft p-3.5">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-over" />
          <div className="text-[13px] leading-snug">
            <p className="font-semibold text-over">This can&apos;t be undone.</p>
            <p className="mt-1 text-muted">
              Your profile, photo, every job, all logged hours and expenses, and
              your milestones will be permanently deleted. You won&apos;t be able
              to sign in with <span className="font-medium text-ink">{email}</span>{' '}
              again unless you create a new account.
            </p>
          </div>
        </div>

        <p className="text-[13px] leading-snug text-muted">
          Need a copy of your records for school or work? Close this and use{' '}
          <span className="font-medium text-ink">Export</span> on the dashboard
          first.
        </p>

        <Field label="Enter your password to confirm">
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
            required
          />
        </Field>

        <Alert>{error}</Alert>

        <div className="flex flex-col gap-2">
          {/* Button spreads its props after its own disabled, so busy has to be
              folded in here or a typed password would re-enable it mid-delete. */}
          <Button
            type="submit"
            variant="danger"
            busy={busy}
            disabled={busy || !password}
          >
            <Trash2 size={16} />
            Delete my account
          </Button>
          <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
