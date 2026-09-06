import { useState } from 'react'
import { Clock, Trash2, Wallet } from 'lucide-react'
import { currencySymbol } from '../lib/format'
import { Sheet } from './Sheet'
import { Alert, Button, Field, FormSection, NumberInput, TextInput } from './ui'

/**
 * Create or edit one job. `job` null → new.
 *
 * Deleting lives here, behind a two-step confirm — including for a user's last
 * job. Refusing that one left people who wanted to start over with a job they
 * could rename but never remove; the dashboard already has an empty state, so
 * there is nothing to protect them from.
 */
const FORM_ID = 'wb-job-form'

export function JobSheet({ open, job, lastJob, onClose, onSubmit, onDelete }) {
  const editing = Boolean(job)

  const [name, setName] = useState(job?.name ?? '')
  const [hours, setHours] = useState(job ? String(Number(job.target_hours)) : '480')
  const [budget, setBudget] = useState(
    job ? String(Number(job.monthly_budget)) : '3000',
  )
  const [dailyBudget, setDailyBudget] = useState(
    job ? String(Number(job.daily_budget)) : '0',
  )
  const [deadline, setDeadline] = useState(job?.deadline ?? '')
  const [rate, setRate] = useState(job ? String(Number(job.hourly_rate)) : '0')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()

    const hoursValue = Number(hours)
    const budgetValue = Number(budget)
    if (!name.trim()) return setError('Give this job a name.')
    if (!Number.isFinite(hoursValue) || hoursValue < 0)
      return setError('Target hours must be zero or more.')
    if (!Number.isFinite(budgetValue) || budgetValue < 0)
      return setError('Budget must be zero or more.')

    const dailyValue = dailyBudget === '' ? 0 : Number(dailyBudget)
    if (!Number.isFinite(dailyValue) || dailyValue < 0)
      return setError('Daily budget must be zero or more.')

    const rateValue = rate === '' ? 0 : Number(rate)
    if (!Number.isFinite(rateValue) || rateValue < 0)
      return setError('Hourly rate must be zero or more.')

    setBusy(true)
    setError(null)

    const { error: err } = await onSubmit({
      name: name.trim(),
      target_hours: hoursValue,
      monthly_budget: budgetValue,
      daily_budget: dailyValue,
      deadline: deadline || null,
      hourly_rate: rateValue,
    })

    if (err) {
      setError(err)
      setBusy(false)
      return
    }
    onClose()
  }

  async function handleDelete() {
    setBusy(true)
    setError(null)
    const { error: err } = await onDelete(job.id)
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
      title={editing ? 'Edit job' : 'New job'}
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
            {editing ? 'Save job' : 'Create job'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Job name">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="OJT at Acme Corp"
            maxLength={60}
            required
          />
        </Field>

        <FormSection label="Hours target" icon={Clock} tone="brand">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Target hours">
              <NumberInput
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="480"
                min="0"
                step="1"
              />
            </Field>
            <Field label="Deadline">
              <TextInput
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </Field>
          </div>
          <p className="mt-1.5 text-xs text-faint">
            The deadline is optional — it powers the “hours per day to finish”
            figure.
          </p>
        </FormSection>

        <FormSection label="Money" icon={Wallet} tone="money">
          <div className="flex flex-col gap-3">
            <Field label="Monthly budget">
              <NumberInput
                adornment={currencySymbol()}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="3000"
                min="0"
                step="1"
              />
            </Field>

            <Field
              label="Daily budget"
              hint="A cap for a single day. Leave at 0 for no daily limit."
            >
              <NumberInput
                adornment={currencySymbol()}
                value={dailyBudget}
                onChange={(e) => setDailyBudget(e.target.value)}
                placeholder="300"
                min="0"
                step="1"
              />
            </Field>

            <Field label="Hourly rate" hint="Leave at 0 for an unpaid placement.">
              <NumberInput
                adornment={currencySymbol()}
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                min="0"
                step="0.01"
              />
            </Field>
          </div>
        </FormSection>

        {editing ? (
          <div className="border-t border-line pt-4">
            {confirmingDelete ? (
              <div className="flex flex-col gap-2">
                <p className="text-[13px] leading-snug text-muted">
                  Deleting <span className="font-semibold text-ink">{job.name}</span>{' '}
                  also deletes every entry logged against it. This can&apos;t be
                  undone.
                  {lastJob
                    ? ' It is your only job, so the dashboard stays empty until you add another.'
                    : ''}
                </p>
                {/* type="button": a bare <button> inside a form defaults to
                    submit, so confirming a delete also fired a save of the job
                    being deleted. */}
                <Button
                  variant="danger"
                  type="button"
                  busy={busy}
                  onClick={handleDelete}
                >
                  Delete job and its entries
                </Button>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                >
                  Keep it
                </Button>
              </div>
            ) : (
              <Button
                variant="dangerGhost"
                type="button"
                onClick={() => setConfirmingDelete(true)}
              >
                <Trash2 size={16} />
                Delete this job
              </Button>
            )}
          </div>
        ) : null}
      </form>
    </Sheet>
  )
}
