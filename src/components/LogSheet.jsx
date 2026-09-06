import { useMemo, useState } from 'react'
import { Clock, NotebookPen, Plus, Wallet, X } from 'lucide-react'
import {
  EXPENSE_CATEGORIES,
  computeHours,
  currencySymbol,
  daysAgoISO,
  effectiveHours,
  formatEntryDate,
  formatHours,
  formatMoney,
  formatTime,
  isInProgress,
  todayISO,
} from '../lib/format'
import { Sheet } from './Sheet'
import {
  Alert,
  Button,
  Field,
  FormSection,
  NumberInput,
  Select,
  TextArea,
  TextInput,
} from './ui'

const FORM_ID = 'wb-log-form'

// Evaluated on render, not at module load: a PWA left open overnight would
// otherwise still call yesterday "today".
const DATE_SHORTCUTS = [
  { label: 'Today', iso: () => todayISO() },
  { label: 'Yesterday', iso: () => daysAgoISO(1) },
]

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
 *
 * Any past date is fair game. Most people start using this partway through a
 * placement and need the weeks they already worked to count, so the date is a
 * first-class field with shortcuts, not a formality fixed to today.
 */
export function LogSheet({
  open,
  log,
  initialDate,
  jobName,
  expenses = [],
  jobLogs = [],
  onOpenExisting,
  onClose,
  onSubmit,
}) {
  const editing = Boolean(log)

  const [date, setDate] = useState(log?.entry_date ?? initialDate ?? todayISO())
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

  /**
   * A soft duplicate check, not a unique constraint: two shifts in one day is
   * legitimate (a morning and an afternoon block), so the second entry is
   * allowed — the user is just told, and offered the existing one instead.
   */
  // Older than the two shortcut chips: the date is worth spelling out, since
  // nothing else on the sheet says which day is being filled in.
  const olderDay = !DATE_SHORTCUTS.some((sc) => sc.iso() === date)

  const duplicate = useMemo(
    () =>
      editing ? null : (jobLogs.find((l) => l.entry_date === date) ?? null),
    [editing, jobLogs, date],
  )

  const total = useMemo(
    () => items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0),
    [items],
  )

  // What this shift is worth right now, versus what it'll finish on. The
  // stored value is the planned total; the dashboard counts elapsed.
  const preview = { entry_date: date, time_in: timeIn, time_out: timeOut,
    break_minutes: Number(breakMins) || 0, hours_worked: computed ?? 0 }
  const running = Boolean(timeIn && timeOut) && isInProgress(preview)
  const soFar = running ? effectiveHours(preview) : null

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
      title={editing ? 'Edit entry' : `Log a day${jobName ? ` · ${jobName}` : ''}`}
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
            {editing ? 'Save changes' : 'Add entry'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div>
          <Field label="Date">
            <TextInput
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </Field>

          {/* Two taps for the days people actually backfill, and the picker
              behind them for anything older. Outside the <Field> on purpose:
              a button inside its <label> would also fire the date picker. */}
          <div className="mt-1.5 flex items-center gap-1.5">
            {DATE_SHORTCUTS.map((shortcut) => {
              const iso = shortcut.iso()
              const on = date === iso
              return (
                <button
                  key={shortcut.label}
                  type="button"
                  onClick={() => setDate(iso)}
                  aria-pressed={on}
                  className={`rounded-full px-2.5 py-1 text-[12px] font-semibold transition ${
                    on ? 'bg-brand-soft text-brand' : 'bg-surface-2 text-muted'
                  }`}
                >
                  {shortcut.label}
                </button>
              )
            })}
            <span className="ml-auto text-[11.5px] text-faint">
              {olderDay ? formatEntryDate(date) : 'Or pick any earlier day'}
            </span>
          </div>
        </div>

        {duplicate ? (
          <div className="rounded-xl bg-warn-soft px-3.5 py-3 text-[13px] leading-snug">
            <p>
              <span className="font-semibold">
                {formatEntryDate(duplicate.entry_date)} is already logged
              </span>{' '}
              ({formatHours(duplicate.hours_worked)}). Saving this adds a second
              entry and both will count.
            </p>
            {onOpenExisting ? (
              <button
                type="button"
                onClick={() => onOpenExisting(duplicate)}
                className="mt-1.5 font-semibold text-warn underline"
              >
                Edit that entry instead
              </button>
            ) : null}
          </div>
        ) : null}

        {/* --- shift ------------------------------------------------------ */}
        <FormSection label="Shift" icon={Clock} tone="brand">
          {/* One column on a phone, two only once there is room.
              A native time control sizes itself — its value and its picker
              button share one row, and every engine reserves a different
              amount for that button. Two of them side by side on a 390px
              screen left too little and the button landed on top of the
              value. Rather than tune padding per browser, the pair only goes
              two-up at a width where any of them fits. Break and hours below
              stay two-up: plain number inputs have no such widget. */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
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

          <div className="mt-2.5 grid grid-cols-2 gap-3">
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
              {/* Any decimal: the computed value is minutes/60 rounded to two
                  places (12.83 for a 12h50m shift), and a quarter-hour step
                  made the browser reject it on save. */}
              <NumberInput
                value={hours}
                onChange={(e) => setHoursOverride(e.target.value)}
                placeholder="8.5"
                step="any"
                min="0"
                max="24"
              />
            </Field>
          </div>

          {computed !== null && hoursOverride === null ? (
            <p className="mt-2 text-[12.5px] leading-snug text-brand">
              {running
                ? `${formatHours(soFar)} so far — counts up to ${formatHours(
                    computed,
                  )} at ${formatTime(timeOut)}.`
                : 'Computed from your shift — edit it to override.'}
            </p>
          ) : null}
        </FormSection>

        {/* --- expenses --------------------------------------------------- */}
        <FormSection
          label="Money spent"
          icon={Wallet}
          tone="money"
          action={
            <span
              className={`text-[14px] font-bold tabular-nums ${
                total > 0 ? 'text-money' : 'text-faint'
              }`}
            >
              {formatMoney(total)}
            </span>
          }
        >
          {/* One expense per block, two rows deep.
              All four controls used to share a single row: a fixed 96px
              category, a fixed 96px amount and a remove button left the label
              about 70px on a 360px phone, which is not enough to read
              "Jeepney fare" back. Stacking gives the label the full width it
              needs and turns each expense into an object you can see the
              edges of. */}
          <div className="flex flex-col gap-2">
            {items.map((item) => (
              <div
                key={item.key}
                className="rounded-2xl border border-line p-2"
              >
                <div className="flex items-center gap-2">
                  <TextInput
                    value={item.label}
                    onChange={(e) => updateItem(item.key, { label: e.target.value })}
                    placeholder="Jeepney fare"
                    aria-label="What it was for"
                    maxLength={120}
                    className="flex-1"
                  />
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

                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <Select
                    value={item.category}
                    onChange={(e) => updateItem(item.key, { category: e.target.value })}
                    aria-label="Expense category"
                    className="text-[14px]"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                  <NumberInput
                    adornment={currencySymbol()}
                    value={item.amount}
                    onChange={(e) => updateItem(item.key, { amount: e.target.value })}
                    placeholder="0.00"
                    aria-label="Amount"
                    step="0.01"
                    min="0"
                  />
                </div>
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
        </FormSection>

        <FormSection label="Note" icon={NotebookPen}>
          <TextArea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional — half day, went to the site office"
            maxLength={280}
          />
        </FormSection>

      </form>
    </Sheet>
  )
}
