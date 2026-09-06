import { useState } from 'react'
import { ArrowRight, Briefcase, Check, UserRound } from 'lucide-react'
import { supabase, errorMessage } from '../lib/supabase'
import { CURRENCIES, OCCUPATIONS, currencySymbol } from '../lib/format'
import { AuthShell } from './AuthShell'
import { Alert, Button, Field, NumberInput, Select, TextInput } from './ui'

/**
 * Runs once, after email verification, before the dashboard exists.
 * Creates the profile details and the user's first job in one step.
 */
export function Onboarding({ userId, onDone }) {
  const [step, setStep] = useState(1)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [middleInitial, setMiddleInitial] = useState('')
  const [age, setAge] = useState('')
  const [occupation, setOccupation] = useState(OCCUPATIONS[0])
  const [currency, setCurrency] = useState('PHP')
  const [jobName, setJobName] = useState('')
  const [targetHours, setTargetHours] = useState('480')
  const [budget, setBudget] = useState('3000')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  function goToStep2(e) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim())
      return setError('First and last name are required.')

    const ageValue = Number(age)
    if (age !== '' && (!Number.isInteger(ageValue) || ageValue < 10 || ageValue > 120))
      return setError('Enter a real age, or leave it blank.')

    setError(null)
    setStep(2)
  }

  async function handleFinish(e) {
    e.preventDefault()

    if (!jobName.trim()) return setError('Give this job a name.')
    const hoursValue = Number(targetHours)
    const budgetValue = Number(budget)
    if (!Number.isFinite(hoursValue) || hoursValue < 0)
      return setError('Target hours must be zero or more.')
    if (!Number.isFinite(budgetValue) || budgetValue < 0)
      return setError('Budget must be zero or more.')

    setBusy(true)
    setError(null)

    const { error: profileErr } = await supabase
      .from('profiles')
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        middle_initial: middleInitial.trim() || null,
        age: age === '' ? null : Number(age),
        occupation,
        currency,
        onboarded_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (profileErr) {
      setError(errorMessage(profileErr))
      setBusy(false)
      return
    }

    // Every account already has a "My OJT" job from the migration; rename that
    // one rather than leaving an empty stray alongside the real first job.
    const { data: existing } = await supabase
      .from('jobs')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)

    const values = {
      name: jobName.trim(),
      target_hours: hoursValue,
      monthly_budget: budgetValue,
    }

    const { error: jobErr } = existing?.length
      ? await supabase.from('jobs').update(values).eq('id', existing[0].id)
      : await supabase.from('jobs').insert({ ...values, user_id: userId })

    if (jobErr) {
      setError(errorMessage(jobErr))
      setBusy(false)
      return
    }
    onDone()
  }

  return (
    <AuthShell
      title={step === 1 ? 'Tell us about you' : 'Your first job'}
      subtitle={
        step === 1
          ? 'So WorkBud can label things properly.'
          : 'Each job tracks its own hours and budget. You can add more later.'
      }
      step={3}
      onBack={step === 2 ? () => setStep(1) : undefined}
      footer={<>Step {step} of 2 — {step === 1 ? 'about you' : 'your first job'}</>}
    >
      {step === 1 ? (
          <form onSubmit={goToStep2} className="flex flex-col gap-4">
            <span className="mb-1 flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <UserRound size={22} />
            </span>

            <div className="grid grid-cols-[1fr_5rem] gap-3">
              <Field label="First name">
                <TextInput
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Juan"
                  autoComplete="given-name"
                  required
                />
              </Field>
              <Field label="M.I.">
                <TextInput
                  value={middleInitial}
                  onChange={(e) => setMiddleInitial(e.target.value)}
                  placeholder="S"
                  maxLength={4}
                  className="text-center"
                />
              </Field>
            </div>

            <Field label="Last name">
              <TextInput
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Dela Cruz"
                autoComplete="family-name"
                required
              />
            </Field>

            <Field label="Age" hint="Optional.">
              <NumberInput
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="21"
                min="10"
                max="120"
                step="1"
              />
            </Field>

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

            <Alert>{error}</Alert>

            <Button type="submit" className="mt-1">
              Continue
              <ArrowRight size={17} />
            </Button>
          </form>
        ) : (
          <form onSubmit={handleFinish} className="flex flex-col gap-4">
            <span className="mb-1 flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <Briefcase size={22} />
            </span>

            <Field label="Job name">
              <TextInput
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
                placeholder="OJT at Acme Corp"
                maxLength={60}
                required
              />
            </Field>

            <Field label="Currency" hint="Used everywhere money is shown.">
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

            <div className="grid grid-cols-2 gap-3">
              <Field label="Target hours">
                <NumberInput
                  value={targetHours}
                  onChange={(e) => setTargetHours(e.target.value)}
                  placeholder="480"
                  min="0"
                  step="1"
                />
              </Field>
              <Field label="Monthly budget">
                <NumberInput
                  adornment={currencySymbol(currency)}
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="3000"
                  min="0"
                  step="1"
                />
              </Field>
            </div>

            <Alert>{error}</Alert>

            <Button type="submit" busy={busy} className="mt-1">
              <Check size={17} />
              Start tracking
            </Button>
          </form>
        )}
    </AuthShell>
  )
}
