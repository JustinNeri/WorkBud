import { Plus } from 'lucide-react'

/**
 * Horizontal, scrollable job switcher. One tab per job, plus an add button.
 *
 * The negative margin cancels the content column's own padding so a row of
 * tabs wider than the column scrolls edge to edge rather than stopping short
 * of it. It has to track that padding at both widths — 20px below lg, 32px
 * above — or the row bleeds by the wrong amount on a monitor.
 */
export function JobTabs({ jobs, activeJobId, onSelect, onAdd }) {
  return (
    <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:-mx-8 lg:px-8">
      {jobs.map((job) => {
        const active = job.id === activeJobId
        return (
          <button
            key={job.id}
            type="button"
            onClick={() => onSelect(job.id)}
            aria-current={active ? 'true' : undefined}
            className={`shrink-0 cursor-pointer rounded-full px-3.5 py-2 text-[13px] font-semibold transition ${
              active
                ? 'bg-brand text-white shadow-card'
                : 'bg-surface text-muted shadow-card hover:text-ink hover:brightness-95 active:brightness-95'
            }`}
          >
            {job.name}
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
