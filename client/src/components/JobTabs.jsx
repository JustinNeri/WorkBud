import { useRef, useState } from 'react'
import { Pencil, Plus } from 'lucide-react'

/**
 * Horizontal, scrollable job switcher. One tab per job, plus an add button.
 *
 * The active tab doubles as a rename control: it is already selected, so a
 * second click has nothing else to do, and the pencil says so. The name turns
 * into an input in place. Enter or clicking away saves, Escape backs out.
 *
 * The negative margin cancels the content column's own padding so a row of
 * tabs wider than the column scrolls edge to edge rather than stopping short
 * of it. It has to track that padding at both widths — 20px below lg, 32px
 * above — or the row bleeds by the wrong amount on a monitor.
 */
export function JobTabs({ jobs, activeJobId, onSelect, onAdd, onRename }) {
  const [renamingId, setRenamingId] = useState(null)

  return (
    <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:-mx-8 lg:px-8">
      {jobs.map((job) => {
        const active = job.id === activeJobId

        if (active && renamingId === job.id) {
          return (
            <RenameInput
              key={job.id}
              job={job}
              onRename={onRename}
              onDone={() => setRenamingId(null)}
            />
          )
        }

        return (
          <button
            key={job.id}
            type="button"
            onClick={() =>
              active && onRename ? setRenamingId(job.id) : onSelect(job.id)
            }
            aria-current={active ? 'true' : undefined}
            title={active && onRename ? 'Rename this job' : undefined}
            className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition ${
              active
                ? 'bg-brand-fill text-white shadow-card'
                : 'bg-surface text-muted shadow-card hover:text-ink hover:brightness-95 active:brightness-95'
            }`}
          >
            {job.name}
            {active && onRename ? (
              <Pencil size={11} className="opacity-70" aria-hidden="true" />
            ) : null}
          </button>
        )
      })}

      <button
        type="button"
        onClick={onAdd}
        aria-label="Add a job"
        className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface text-muted shadow-card transition hover:text-ink hover:brightness-95 active:brightness-95"
      >
        <Plus size={17} />
      </button>
    </div>
  )
}

function RenameInput({ job, onRename, onDone }) {
  const [name, setName] = useState(job.name)
  const [error, setError] = useState(null)
  // Enter saves and then the input blurs; Escape blurs without saving. The ref
  // keeps either from firing a second commit.
  const settled = useRef(false)

  async function commit() {
    if (settled.current) return
    const next = name.trim()
    // An emptied or untouched name is a cancel, not an error to argue about.
    if (!next || next === job.name) return onDone()

    settled.current = true
    const { error: err } = await onRename(job.id, next)
    if (err) {
      settled.current = false
      setError(err)
      return
    }
    onDone()
  }

  return (
    <input
      autoFocus
      value={name}
      onChange={(e) => {
        setName(e.target.value)
        setError(null)
      }}
      onFocus={(e) => e.target.select()}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') {
          settled.current = true
          onDone()
        }
      }}
      maxLength={60}
      aria-label="Job name"
      aria-invalid={error ? 'true' : undefined}
      title={error ?? undefined}
      // Sized to the text so the pill keeps hugging the name as it is typed.
      style={{ width: `${Math.max(name.length, 4) + 2}ch` }}
      className={`box-content shrink-0 rounded-full bg-brand-fill px-3.5 py-2 text-[13px] font-semibold text-white shadow-card outline-none ring-2 ${
        error ? 'ring-red-400' : 'ring-white/60'
      }`}
    />
  )
}
