import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Sheet } from './Sheet'
import { Alert, Button, Field, NumberInput } from './ui'

export function SettingsSheet({ open, profile, email, onClose, onSave }) {
  const [targetHours, setTargetHours] = useState(
    profile ? String(Number(profile.target_hours)) : '',
  )
  const [budget, setBudget] = useState(
    profile ? String(Number(profile.monthly_budget)) : '',
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()

    const hoursValue = Number(targetHours)
    const budgetValue = Number(budget)

    if (!Number.isFinite(hoursValue) || hoursValue < 0)
      return setError('Target hours must be zero or more.')
    if (!Number.isFinite(budgetValue) || budgetValue < 0)
      return setError('Monthly budget must be zero or more.')

    setBusy(true)
    setError(null)

    const { error: err } = await onSave({
      target_hours: hoursValue,
      monthly_budget: budgetValue,
    })

    if (err) {
      setError(err)
      setBusy(false)
      return
    }
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Settings">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field
          label="Target OJT hours"
          hint="Total hours you need to complete your placement."
        >
          <NumberInput
            value={targetHours}
            onChange={(e) => setTargetHours(e.target.value)}
            placeholder="480"
            step="1"
            min="0"
          />
        </Field>

        <Field label="Monthly budget" hint="Resets at the start of each month.">
          <NumberInput
            adornment="$"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="300"
            step="1"
            min="0"
          />
        </Field>

        <Alert>{error}</Alert>

        <Button type="submit" busy={busy} className="mt-1">
          Save targets
        </Button>

        <div className="mt-2 border-t border-line pt-4">
          <p className="mb-3 text-center text-[13px] text-muted">
            Signed in as <span className="font-medium text-ink">{email}</span>
          </p>
          <Button
            type="button"
            variant="ghost"
            onClick={() => supabase.auth.signOut()}
          >
            <LogOut size={17} />
            Sign out
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
