import { useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import {
  EXPENSE_CATEGORIES,
  computeHours,
  currencySymbol,
  formatMoney,
  todayISO,
} from '../lib/format'
import { Sheet } from './Sheet'
import { Alert, Button, Field, NumberInput, TextArea, TextInput } from './ui'

let tempId = 0
const newItem = () => ({
  key: `new-${tempId++}`,
  label: '',
  amount: '',
  category: 'transport',
})

/**
 * Create or edit one day.
 *
 * Hours come from time in/out minus the break, so the user never does the
 * arithmetic — but the field stays editable for days that don't fit a shift.
 * Spending is a list of things bought; the day's total is their sum.
 */
export function LogSheet({ open, log, jobName, expenses = [], onClose, onSubmit }) {
  const editing = Boolean(log)

  const [date, setDate] = useState(log?.entry_date ?? todayISO())
  const [timeIn, setTimeIn] = useState(log?.time_in?.slice(0, 5) ?? '')
  const [timeOut, setTimeOut] = useState(log?.time_out?.slice(0, 5) ?? '')
  const [breakMins, setBreakMins] = useState(
    log?.break_minutes ? String(log.break_minutes) : '',
  )
  // Set only when the user types over the computed value.
  const [hoursOverride, setHoursOverride] = useState(null)
  const [note, setNote] = useState(log?.description ?? '')
  const [items, setItems] = useState(() =>
    expenses.length
      ? expenses.map((e) => ({
          key: e.id,
          label: e.label ?? '',
          amount: String(Number(e.amount)),
          category: e.category ?? 'other',
        }))
      : [newItem()],
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const computed = computeHours(timeIn, timeOut, Number(breakMins) || 0)
  const hours =
    hoursOverride !== null
      ? hoursOverride
      : computed !== null
        ? String(computed)
        : log
          ? String(Number(log.hours_worked))
          : ''

  const total = useMemo(
    () => items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0),
    [items],
  )

  function updateItem(key, patch) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)))
  }

  async function handleSubmit(e) {
    e.preventDefault()

    const hoursValue = hours === '' ? 0 : Number(hours)
    if (!date) return setError('Pick a date for this entry.')
    if (!Number.isFinite(hoursValue) || hoursValue < 0 || hoursValue > 24)
      return setError('Hours must be between 0 and 24.')
    if (items.some((i) => i.amount !== '' && Number(i.amount) < 0))
      return setError('An expense cannot be negative.')

    // Drop blank rows; a row with an amount but no label is fine.
    const kept = items
      .filter((i) => i.amount !== '' && Number(i.amount) > 0)
      .map((i) => ({
        label: i.label.trim() || null,
        amount: Number(i.amount),
        category: i.category,
      }))

    if (hoursValue === 0 && kept.length === 0 && !note.trim())
      return setError('Add some hours, an expense, or a note.')

    setBusy(true)
    setError(null)

    const { error: err } = await onSubmit(
      {
        entry_date: date,
        hours_worked: hoursValue,
        amount_spent: kept.reduce((sum, i) => sum + i.amount, 0),
        time_in: timeIn || null,
        time_out: timeOut || null,
        break_minutes: Number(breakMins) || 0,
        description: note.trim() || null,
      },
      kept,
    )

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

        {/* --- shift ------------------------------------------------------ */}
        <div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Time in">
              <TextInput
                type="time"
                value={timeIn}
                onChange={(e) => {
                  setTimeIn(e.target.value)
                  setHoursOverride(null)
                }}
              />
            </Field>
            <Field label="Time out">
              <TextInput
                type="time"
                value={timeOut}
                onChange={(e) => {
                  setTimeOut(e.target.value)
                  setHoursOverride(null)
                }}
              />
            </Field>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Break (mins)">
              <NumberInput
                value={breakMins}
                onChange={(e) => {
                  setBreakMins(e.target.value)
                  setHoursOverride(null)
                }}
                placeholder="60"
                min="0"
                max="1439"
                step="5"
              />
            </Field>
            <Field label="Hours worked">
              <NumberInput
                value={hours}
                onChange={(e) => setHoursOverride(e.target.value)}
                placeholder="8.5"
                step="0.25"
                min="0"
                max="24"
              />
            </Field>
          </div>

          {computed !== null && hoursOverride === null ? (
            <p className="mt-1.5 text-[12.5px] text-brand">
              Computed from your shift — edit it to override.
            </p>
          ) : null}
        </div>

        {/* --- expenses --------------------------------------------------- */}
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-[13px] font-medium text-muted">Money spent</span>
            <span className="text-[13px] font-semibold">{formatMoney(total)}</span>
          </div>

          <div className="flex flex-col gap-2">
            {items.map((item) => (
              <div key={item.key} className="flex items-center gap-2">
                <select
                  value={item.category}
                  onChange={(e) => updateItem(item.key, { category: e.target.value })}
                  aria-label="Expense category"
                  className="w-24 shrink-0 appearance-none rounded-xl border border-line bg-surface-2 px-2 py-3 text-[13px] text-ink focus:border-brand focus:bg-surface"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <TextInput
                  value={item.label}
                  onChange={(e) => updateItem(item.key, { label: e.target.value })}
                  placeholder="Jeepney fare"
                  maxLength={120}
                  className="flex-1"
                />
                <div className="w-24 shrink-0">
                  <NumberInput
                    adornment={currencySymbol()}
                    value={item.amount}
                    onChange={(e) => updateItem(item.key, { amount: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setItems((prev) =>
                      prev.length === 1
                        ? [newItem()]
                        : prev.filter((i) => i.key !== item.key),
                    )
                  }
                  aria-label="Remove this expense"
                  className="shrink-0 rounded-lg p-2 text-faint transition-colors active:bg-over-soft active:text-over"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setItems((prev) => [...prev, newItem()])}
            className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand"
          >
            <Plus size={15} />
            Add another expense
          </button>
        </div>

        <Field label="Note" hint="Optional — how the day went overall.">
          <TextArea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Half day, went to the site office"
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
