import { useState } from 'react'
import { currencySymbol, todayISO } from '../lib/format'
import { Sheet } from './Sheet'
import { Alert, Button, Field, NumberInput, TextArea, TextInput } from './ui'

/**
 * Create or edit one daily entry. `log` null → new entry dated today.
 * Inputs stay strings while typing so a half-typed "8." doesn't snap to 8.
 */
export function LogSheet({ open, log, jobName, onClose, onSubmit }) {
  const editing = Boolean(log)

  const [date, setDate] = useState(log?.entry_date ?? todayISO())
  const [hours, setHours] = useState(log ? String(Number(log.hours_worked)) : '')
  const [spent, setSpent] = useState(log ? String(Number(log.amount_spent)) : '')
  const [note, setNote] = useState(log?.description ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()

    const hoursValue = hours === '' ? 0 : Number(hours)
    const spentValue = spent === '' ? 0 : Number(spent)

    // Mirrors the CHECK constraints so the user gets a message, not a 400.
    if (!date) return setError('Pick a date for this entry.')
    if (!Number.isFinite(hoursValue) || hoursValue < 0 || hoursValue > 24)
      return setError('Hours must be between 0 and 24.')
    if (!Number.isFinite(spentValue) || spentValue < 0)
      return setError('Amount spent cannot be negative.')
    if (hoursValue === 0 && spentValue === 0 && !note.trim())
      return setError('Add some hours, an amount, or a note.')

    setBusy(true)
    setError(null)

    const { error: err } = await onSubmit({
      entry_date: date,
      hours_worked: hoursValue,
      amount_spent: spentValue,
      description: note.trim() || null,
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
      title={editing ? 'Edit entry' : `Log today${jobName ? ` · ${jobName}` : ''}`}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Date">
          <TextInput
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Hours worked">
            <NumberInput
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="8.5"
              step="0.25"
              min="0"
              max="24"
            />
          </Field>

          <Field label="Money spent">
            <NumberInput
              adornment={currencySymbol()}
              value={spent}
              onChange={(e) => setSpent(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
            />
          </Field>
        </div>

        <Field label="Note" hint="Optional — what the day looked like.">
          <TextArea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Commute + lunch"
            maxLength={280}
          />
        </Field>

        <Alert>{error}</Alert>

        <Button type="submit" busy={busy} className="mt-1">
          {editing ? 'Save changes' : 'Add entry'}
        </Button>
      </form>
    </Sheet>
  )
}
