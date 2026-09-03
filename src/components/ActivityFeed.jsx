import { CalendarDays, Clock, Pencil, Trash2, Wallet } from 'lucide-react'
import { formatEntryDate, formatHours, formatMoney } from '../lib/format'

function LogRow({ log, onEdit, onDelete, deleting }) {
  return (
    <li
      className={`flex items-start gap-3 px-4 py-3.5 transition-opacity ${
        deleting ? 'opacity-40' : ''
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-semibold">
            {formatEntryDate(log.entry_date)}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
          <span className="inline-flex items-center gap-1 font-medium text-brand">
            <Clock size={13} />
            {formatHours(log.hours_worked)}
          </span>
          <span
            className={`inline-flex items-center gap-1 font-medium ${
              Number(log.amount_spent) > 0 ? 'text-money' : 'text-faint'
            }`}
          >
            <Wallet size={13} />
            {formatMoney(log.amount_spent)}
          </span>
        </div>

        {log.description ? (
          <p className="mt-1.5 text-[13px] leading-snug text-muted">
            {log.description}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={() => onEdit(log)}
          aria-label={`Edit entry for ${formatEntryDate(log.entry_date)}`}
          className="rounded-lg p-2 text-muted transition-colors active:bg-surface-2"
        >
          <Pencil size={16} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(log)}
          aria-label={`Delete entry for ${formatEntryDate(log.entry_date)}`}
          className="rounded-lg p-2 text-muted transition-colors active:bg-over-soft active:text-over"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </li>
  )
}

export function ActivityFeed({ logs, onEdit, onDelete, deletingId }) {
  return (
    <section className="animate-rise" style={{ animationDelay: '120ms' }}>
      <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-faint">
        Activity
      </h2>

      {logs.length === 0 ? (
        <div className="rounded-2xl bg-surface px-6 py-12 text-center shadow-card">
          <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-surface-2 text-faint">
            <CalendarDays size={22} />
          </span>
          <p className="text-[15px] font-semibold">No entries yet</p>
          <p className="mt-1 text-[13px] text-muted">
            Tap <span className="font-semibold text-brand">+</span> to log your
            first day.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-surface shadow-card">
          {logs.map((log) => (
            <LogRow
              key={log.id}
              log={log}
              onEdit={onEdit}
              onDelete={onDelete}
              deleting={deletingId === log.id}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
