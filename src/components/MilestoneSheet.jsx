import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Sheet } from './Sheet'
import { Alert, Button, Field, NumberInput, TextInput } from './ui'

const FORM_ID = 'wb-milestone-form'

// The checkpoints most OJT programs share — one tap instead of typing on a
// phone keyboard. Only offered for a new milestone.
const SUGGESTIONS = [
  'Orientation',
  'Midterm evaluation',
  'Narrative report',
  'Final evaluation',
]

/** Create or edit one milestone for the active job. `milestone` null → new. */
export function MilestoneSheet({
  open,
  milestone,
  targetHours,
  onClose,
  onSubmit,
  onDelete,
}) {
  const editing = Boolean(milestone)

  const [title, setTitle] = useState(milestone?.title ?? '')
  const [dueDate, setDueDate] = useState(milestone?.due_date ?? '')
  const [hours, setHours] = useState(
    milestone?.target_hours ? String(Number(milestone.target_hours)) : '',
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()

    if (!title.trim()) return setError('Give this milestone a name.')

    const hoursValue = hours === '' ? null : Number(hours)
    if (hoursValue !== null && (!Number.isFinite(hoursValue) || hoursValue <= 0))
      return setError('Hours goal must be more than zero, or left blank.')

    setBusy(true)
    setError(null)

    const { error: err } = await onSubmit({
      title: title.trim(),
      due_date: dueDate || null,
      target_hours: hoursValue,
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
    const { error: err } = await onDelete(milestone.id)
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
      title={editing ? 'Edit milestone' : 'New milestone'}
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
            {editing ? 'Save milestone' : 'Add milestone'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <Field label="Milestone">
            <TextInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Midterm evaluation"
              maxLength={80}
              required
            />
          </Field>
          {!editing ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTitle(s)}
                  className={`rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                    title === s
                      ? 'bg-brand-soft text-brand'
                      : 'bg-surface-2 text-muted active:bg-brand-soft active:text-brand'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Due date">
            <TextInput
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </Field>
          <Field label="Hours goal">
            <NumberInput
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder={targetHours > 0 ? String(Math.round(targetHours / 2)) : '240'}
              min="0"
              step="1"
            />
          </Field>
        </div>
        <p className="-mt-2 text-xs text-faint">
          Both are optional. An hours goal shows a progress bar against the hours
          you&apos;ve logged on this job.
        </p>

        {editing ? (
          <div className="border-t border-line pt-4">
            {confirmingDelete ? (
              <div className="flex flex-col gap-2">
                <p className="text-[13px] leading-snug text-muted">
                  Delete <span className="font-semibold text-ink">{milestone.title}</span>?
                  This can&apos;t be undone.
                </p>
                {/* type="button": inside a form a bare button would submit. */}
                <Button variant="danger" type="button" busy={busy} onClick={handleDelete}>
                  Delete milestone
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
                Delete this milestone
              </Button>
            )}
          </div>
        ) : null}
      </form>
    </Sheet>
  )
}
