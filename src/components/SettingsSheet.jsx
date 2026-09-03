import { useState } from 'react'
import { KeyRound, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { CURRENCIES } from '../lib/format'
import { Sheet } from './Sheet'
import { Alert, Button, Field, NumberInput, TextInput } from './ui'

const OCCUPATIONS = [
  'Student — OJT / Internship',
  'Student — not working',
  'Employed — full-time',
  'Employed — part-time',
  'Freelancer / Contractor',
  'Business owner / Self-employed',
  'Apprentice / Trainee',
  'Between jobs',
  'Other',
]

const selectClass =
  'w-full appearance-none rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-ink focus:border-brand focus:bg-surface'

/** Account-level settings. Hour and budget targets live on each job instead. */
export function SettingsSheet({
  open,
  profile,
  email,
  onClose,
  onSave,
  onChangePassword,
}) {
  const [firstName, setFirstName] = useState(profile?.first_name ?? '')
  const [lastName, setLastName] = useState(profile?.last_name ?? '')
  const [middleInitial, setMiddleInitial] = useState(profile?.middle_initial ?? '')
  const [age, setAge] = useState(profile?.age != null ? String(profile.age) : '')
  const [occupation, setOccupation] = useState(profile?.occupation ?? OCCUPATIONS[0])
  const [currency, setCurrency] = useState(profile?.currency ?? 'PHP')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()

    if (!firstName.trim() || !lastName.trim())
      return setError('First and last name are required.')

    const ageValue = Number(age)
    if (age !== '' && (!Number.isInteger(ageValue) || ageValue < 10 || ageValue > 120))
      return setError('Enter a real age, or leave it blank.')

    setBusy(true)
    setError(null)

    const { error: err } = await onSave({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      middle_initial: middleInitial.trim() || null,
      age: age === '' ? null : ageValue,
      occupation,
      currency,
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
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Field label="First name">
            <TextInput
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              required
            />
          </Field>
          <Field label="M.I.">
            <TextInput
              value={middleInitial}
              onChange={(e) => setMiddleInitial(e.target.value)}
              maxLength={4}
              className="w-16 text-center"
            />
          </Field>
        </div>

        <Field label="Last name">
          <TextInput
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
            required
          />
        </Field>

        <Field label="Age" hint="Optional.">
          <NumberInput
            value={age}
            onChange={(e) => setAge(e.target.value)}
            min="10"
            max="120"
            step="1"
          />
        </Field>

        <Field label="What do you do?">
          <select
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
            className={selectClass}
          >
            {OCCUPATIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Currency" hint="Applies everywhere money is shown.">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className={selectClass}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} — {c.label} ({c.code})
              </option>
            ))}
          </select>
        </Field>

        <Alert>{error}</Alert>

        <Button type="submit" busy={busy} className="mt-1">
          Save changes
        </Button>

        <div className="mt-2 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={onChangePassword}>
            <KeyRound size={17} />
            Change password
          </Button>
        </div>

        <div className="border-t border-line pt-4">
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
