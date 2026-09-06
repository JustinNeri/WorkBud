import { useState } from 'react'
import { KeyRound, LogOut, ShieldCheck, UserRound, Wallet } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { CURRENCIES, OCCUPATIONS } from '../lib/format'
import { Sheet } from './Sheet'
import { Alert, Button, Field, FormSection, NumberInput, Select, TextInput } from './ui'

const FORM_ID = 'wb-settings-form'

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
    <Sheet
      open={open}
      onClose={onClose}
      title="Settings"
      footer={
        <>
          <Alert>{error}</Alert>
          {/* Outside <form>, so the form attribute is what still submits it. */}
          <Button
            type="submit"
            form={FORM_ID}
            busy={busy}
            className={error ? 'mt-2' : ''}
          >
            Save changes
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormSection label="About you" icon={UserRound} tone="brand" first>
          <div className="flex flex-col gap-3">
            {/* The M.I. width lives on the grid track: `w-16` on the input
                loses to `w-full` from the shared field style, since Tailwind's
                sort order decides between two rules for the same property. */}
            <div className="grid grid-cols-[1fr_5rem] gap-3">
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
                  className="text-center"
                />
              </Field>
            </div>

            <div className="grid grid-cols-[1fr_5rem] gap-3">
              <Field label="Last name">
                <TextInput
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  required
                />
              </Field>
              <Field label="Age">
                <NumberInput
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  min="10"
                  max="120"
                  step="1"
                  className="text-center"
                />
              </Field>
            </div>

            <Field label="What do you do?">
              <Select
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
              >
                {OCCUPATIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </FormSection>

        <FormSection label="Money" icon={Wallet} tone="money">
          <Field label="Currency" hint="Applies everywhere money is shown.">
          <Select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} — {c.label} ({c.code})
              </option>
            ))}
          </Select>
          </Field>
        </FormSection>

        <FormSection label="Account" icon={ShieldCheck}>
          <p className="mb-3 text-[13px] leading-snug break-words text-muted">
            Signed in as <span className="font-medium text-ink">{email}</span>
          </p>
          <div className="flex flex-col gap-2">
            <Button type="button" variant="secondary" onClick={onChangePassword}>
              <KeyRound size={17} />
              Change password
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => supabase.auth.signOut()}
            >
              <LogOut size={17} />
              Sign out
            </Button>
          </div>
        </FormSection>
      </form>
    </Sheet>
  )
}
