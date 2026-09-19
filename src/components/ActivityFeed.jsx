import { useState } from 'react'
import {
  CalendarDays,
  CalendarX2,
  ChevronDown,
  ChevronRight,
  Clock,
  Trash2,
  Wallet,
} from 'lucide-react'
import {
  effectiveHours,
  formatEntryDate,
  formatHours,
  formatMoney,
  formatTime,
  fromISODate,
  isInProgress,
} from '../lib/format'

/** Compact day badge: "SEP / 3" — the scannable anchor for each row. */
function DateBadge({ iso, today }) {
  const date = fromISODate(iso)
  return (
    <div
      className={`flex size-11 shrink-0 flex-col items-center justify-center rounded-2xl ${
        today ? 'bg-brand-fill text-white' : 'bg-brand-soft text-brand'
      }`}
    >
      <span className="text-[9px] font-bold uppercase tracking-wide opacity-80">
        {date.toLocaleDateString('en-US', { month: 'short' })}
      </span>
      <span className="text-[15px] font-bold leading-none">{date.getDate()}</span>
    </div>
  )
}

function LogRow({ log, items, onEdit, onDelete, deleting, isToday, overBy }) {
  const spent = Number(log.amount_spent)
  const absent = Boolean(log.absent)
  const hoursSoFar = effectiveHours(log)
  const running = isInProgress(log)
  const shift =
    log.time_in && log.time_out
      ? `${formatTime(log.time_in)} – ${formatTime(log.time_out)}`
      : null

  return (
    <li
      className={`flex items-stretch transition-opacity ${
        deleting ? 'opacity-40' : ''
      }`}
    >
      {/* The whole row opens the editor; delete sits outside it so the two
          controls never nest. */}
      <button
        type="button"
        onClick={() => onEdit(log)}
        aria-label={`Edit entry for ${formatEntryDate(log.entry_date)}`}
        className="flex min-w-0 flex-1 items-center gap-3 py-3 pr-2 pl-3.5 text-left transition-colors active:bg-surface-2"
      >
        <DateBadge iso={log.entry_date} today={isToday} />

        <div className="min-w-0 flex-1">
          {/* Wraps as whole pieces: on a narrow phone the shift drops under
              the date instead of splitting "Thu, Sep 17" across two lines. */}
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="whitespace-nowrap text-[14px] font-semibold">
              {formatEntryDate(log.entry_date)}
            </span>
            {shift ? (
              <span className="whitespace-nowrap text-[12px] text-faint">{shift}</span>
            ) : null}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {/* A day off reads as a stated fact, not a gap. Amber rather than
                red: not going in is a normal part of a placement, and it is
                already accounted for in the expected finish. */}
            {absent ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-warn-soft px-1.5 py-0.5 text-[12px] font-semibold text-warn">
                <CalendarX2 size={11} />
                Did not work
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md bg-brand-soft px-1.5 py-0.5 text-[12px] font-semibold text-brand">
                <Clock size={11} />
                {formatHours(hoursSoFar)}
                {running ? (
                  <span className="font-normal opacity-70">so far</span>
                ) : null}
              </span>
            )}
            {/* A day that broke the daily cap wears it here, where the day is
                being scanned — the budget card only reports today. Amber, not
                red: these rows are read in a scroll, and a column of red
                alarms down the feed is a reason to stop opening the app.
                The overage is spelled out because "₱850.00 over" alone reads
                as though the whole 850 was the excess. */}
            <span
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-semibold ${
                overBy > 0
                  ? 'bg-warn-soft text-warn'
                  : spent > 0
                    ? 'bg-money-soft text-money'
                    : 'bg-surface-2 text-faint'
              }`}
            >
              <Wallet size={11} />
              {formatMoney(spent)}
              {overBy > 0 ? (
                <span className="font-normal">· {formatMoney(overBy)} over</span>
              ) : null}
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

        <ChevronRight size={16} className="shrink-0 text-faint" />
      </button>

      <button
        type="button"
        onClick={() => onDelete(log)}
        aria-label={`Delete entry for ${formatEntryDate(log.entry_date)}`}
        className="shrink-0 px-3 text-faint transition-colors active:bg-over-soft active:text-over"
      >
        <Trash2 size={15} />
      </button>
    </li>
  )
}

// Rows shown before "Show all". Enough to cover the last working week, which
// is what someone checking the feed after a shift is usually looking at.
const PREVIEW_COUNT = 5

/** "Sep" for this year, "Dec 2025" for any other, so a long placement that
    crosses New Year never shows two chips that read the same. */
function monthLabel(key) {
  const [year, month] = key.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  const sameYear = year === new Date().getFullYear()
  return date.toLocaleDateString('en-US', {
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition ${
        active
          ? 'bg-brand-fill text-white shadow-card'
          : 'bg-surface text-muted shadow-card hover:text-ink active:brightness-95'
      }`}
    >
      {children}
    </button>
  )
}

export function ActivityFeed({
  logs,
  expensesFor,
  onEdit,
  onDelete,
  deletingId,
  todayISO,
  overDates,
}) {
  const [month, setMonth] = useState('all') // 'all' | 'YYYY-MM'
  const [expanded, setExpanded] = useState(false)

  // Months that actually have entries, newest first — logs already arrive in
  // that order, so first-seen order is the right one.
  const months = [...new Set(logs.map((l) => l.entry_date.slice(0, 7)))]

  // A month picked on one job may not exist on the next, or its last entry
  // may have just been deleted; fall back to everything rather than an empty
  // list with no obvious way out.
  const activeMonth = months.includes(month) ? month : 'all'
  const filtered =
    activeMonth === 'all'
      ? logs
      : logs.filter((l) => l.entry_date.startsWith(activeMonth))
  const visible = expanded ? filtered : filtered.slice(0, PREVIEW_COUNT)
  const hidden = filtered.length - visible.length

  const monthHours =
    activeMonth === 'all'
      ? 0
      : filtered.reduce((sum, l) => sum + effectiveHours(l), 0)
  const monthDays = filtered.filter((l) => !l.absent).length

  function pickMonth(key) {
    setMonth(key)
    // A new month starts collapsed, the same as the feed does on load.
    setExpanded(false)
  }

  // The heading and the entry count live in the dashboard's SectionHeading, so
  // this feed lines up with the Hours and Money groups above it.
  return (
    <section className="animate-rise" style={{ animationDelay: '230ms' }}>
      {logs.length === 0 ? (
        <div className="rounded-3xl bg-surface px-6 py-12 text-center shadow-card">
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
        <>
          {/* Only worth a filter once there is more than one month to pick. */}
          {months.length > 1 ? (
            <div
              role="group"
              aria-label="Filter by month"
              className="no-scrollbar -mx-1 mb-2.5 flex gap-1.5 overflow-x-auto px-1 pb-1"
            >
              <Chip active={activeMonth === 'all'} onClick={() => pickMonth('all')}>
                All
              </Chip>
              {months.map((key) => (
                <Chip
                  key={key}
                  active={activeMonth === key}
                  onClick={() => pickMonth(key)}
                >
                  {monthLabel(key)}
                </Chip>
              ))}
            </div>
          ) : null}

          {activeMonth !== 'all' ? (
            <p className="mb-2 px-1 text-[12.5px] text-muted">
              <span className="font-semibold text-ink">{formatHours(monthHours)}</span>{' '}
              over {monthDays} {monthDays === 1 ? 'day' : 'days'} in{' '}
              {monthLabel(activeMonth)}
            </p>
          ) : null}

          <ul className="divide-y divide-line overflow-hidden rounded-3xl bg-surface shadow-card">
            {visible.map((log) => (
              <LogRow
                key={log.id}
                log={log}
                items={expensesFor(log.id)}
                onEdit={onEdit}
                onDelete={onDelete}
                deleting={deletingId === log.id}
                isToday={log.entry_date === todayISO}
                overBy={overDates?.get(log.entry_date) ?? 0}
              />
            ))}
          </ul>

          {filtered.length > PREVIEW_COUNT ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="mt-2.5 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-2xl bg-surface py-3 text-[13px] font-semibold text-brand shadow-card transition hover:brightness-110 active:brightness-95"
            >
              {expanded ? 'Show less' : `Show all ${filtered.length}`}
              {!expanded ? (
                <span className="font-medium text-faint">· {hidden} more</span>
              ) : null}
              <ChevronDown
                size={15}
                className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
              />
            </button>
          ) : null}
        </>
      )}
    </section>
  )
}
