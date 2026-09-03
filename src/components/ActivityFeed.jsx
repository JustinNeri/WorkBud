import { CalendarDays, Clock, Pencil, Trash2, Wallet } from 'lucide-react'
import {
  formatEntryDate,
  formatHours,
  formatMoney,
  formatTime,
  fromISODate,
} from '../lib/format'

/** Compact day badge: "SEP / 3" — the scannable anchor for each row. */
function DateBadge({ iso, today }) {
  const date = fromISODate(iso)
  return (
    <div
      className={`flex size-11 shrink-0 flex-col items-center justify-center rounded-xl ${
        today ? 'bg-brand text-white' : 'bg-surface-2 text-muted'
      }`}
    >
      <span className="text-[9px] font-bold uppercase tracking-wide opacity-80">
        {date.toLocaleDateString('en-US', { month: 'short' })}
      </span>
      <span className="text-[15px] font-bold leading-none">{date.getDate()}</span>
    </div>
  )
}

function LogRow({ log, items, onEdit, onDelete, deleting, isToday }) {
  const spent = Number(log.amount_spent)
  const shift =
    log.time_in && log.time_out
      ? `${formatTime(log.time_in)} – ${formatTime(log.time_out)}`
      : null

  return (
    <li
      className={`flex items-center gap-3 px-3.5 py-3 transition-opacity ${
        deleting ? 'opacity-40' : ''
      }`}
    >
      <DateBadge iso={log.entry_date} today={isToday} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold">
            {formatEntryDate(log.entry_date)}
          </span>
          {shift ? (
            <span className="truncate text-[12px] text-faint">{shift}</span>
          ) : null}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-md bg-brand-soft px-1.5 py-0.5 text-[12px] font-semibold text-brand">
            <Clock size={11} />
            {formatHours(log.hours_worked)}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-semibold ${
              spent > 0 ? 'bg-money-soft text-money' : 'bg-surface-2 text-faint'
            }`}
          >
            <Wallet size={11} />
            {formatMoney(spent)}
          </span>
        </div>

        {items.length > 1 ? (
          <p className="mt-1 truncate text-[12px] text-faint">
            {items
              .map((i) => `${i.label || 'Expense'} ${formatMoney(i.amount)}`)
              .join(' · ')}
          </p>
        ) : null}

        {log.description ? (
          <p className="mt-1.5 truncate text-[12.5px] leading-snug text-muted">
            {log.description}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center">
        <button
          type="button"
          onClick={() => onEdit(log)}
          aria-label={`Edit entry for ${formatEntryDate(log.entry_date)}`}
          className="rounded-lg p-2 text-faint transition-colors active:bg-surface-2 active:text-ink"
        >
          <Pencil size={15} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(log)}
          aria-label={`Delete entry for ${formatEntryDate(log.entry_date)}`}
          className="rounded-lg p-2 text-faint transition-colors active:bg-over-soft active:text-over"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </li>
  )
}

export function ActivityFeed({
  logs,
  expensesFor,
  onEdit,
  onDelete,
  deletingId,
  todayISO,
}) {
  return (
    <section className="animate-rise" style={{ animationDelay: '230ms' }}>
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h2 className="text-[12px] font-bold uppercase tracking-wide text-faint">
          Activity
        </h2>
        {logs.length > 0 ? (
          <span className="text-[12px] text-faint">
            {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
          </span>
        ) : null}
      </div>

      {logs.length === 0 ? (
        <div className="rounded-2xl bg-surface px-6 py-12 text-center shadow-card">
          <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
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
              items={expensesFor(log.id)}
              onEdit={onEdit}
              onDelete={onDelete}
              deleting={deletingId === log.id}
              isToday={log.entry_date === todayISO}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
