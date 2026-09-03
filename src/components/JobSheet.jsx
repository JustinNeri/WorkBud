import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { currencySymbol } from '../lib/format'
import { Sheet } from './Sheet'
import { Alert, Button, Field, NumberInput, TextInput } from './ui'

/**
 * Create or edit one job. `job` null → new. Deleting is offered only when
 * editing, and only when it isn't the user's last job.
 */
export function JobSheet({ open, job, canDelete, onClose, onSubmit, onDelete }) {
  const editing = Boolean(job)

  const [name, setName] = useState(job?.name ?? '')
  const [hours, setHours] = useState(job ? String(Number(job.target_hours)) : '480')
  const [budget, setBudget] = useState(
    job ? String(Number(job.monthly_budget)) : '3000',
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

    const rateValue = rate === '' ? 0 : Number(rate)
    if (!Number.isFinite(rateValue) || rateValue < 0)
      return setError('Hourly rate must be zero or more.')

    setBusy(true)
    setError(null)

    const { error: err } = await onSubmit({
      name: name.trim(),
      target_hours: hoursValue,
      monthly_budget: budgetValue,
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
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Job name">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="OJT at Acme Corp"
            maxLength={60}
            required
          />
        </Field>

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
        </div>

        <Field
          label="Deadline"
          hint="Optional — powers the “hours per day to finish” figure."
        >
          <TextInput
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
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

        <Alert>{error}</Alert>

        <Button type="submit" busy={busy} className="mt-1">
          {editing ? 'Save job' : 'Create job'}
        </Button>

        {editing && canDelete ? (
          <div className="mt-2 border-t border-line pt-4">
            {confirmingDelete ? (
              <div className="flex flex-col gap-2">
                <p className="text-[13px] leading-snug text-muted">
                  Deleting <span className="font-semibold text-ink">{job.name}</span>{' '}
                  also deletes every entry logged against it. This can&apos;t be
                  undone.
                </p>
                <Button variant="danger" busy={busy} onClick={handleDelete}>
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
                variant="ghost"
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
