import { Check, Flag, Pencil, Plus, Trophy } from 'lucide-react'
import {
  daysUntil,
  formatEntryDate,
  formatHours,
  fromISODate,
  toISODate,
} from '../lib/format'
import { Meter } from './Meter'

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`
const round = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1))
const shortDate = (iso) =>
  fromISODate(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

/**
 * The line under a checkpoint's title — the one thing about it worth reading
 * right now. Order matters: a finished milestone only needs its date, an hours
 * goal already met is a nudge to tick it off, and only then does the due date
 * speak, louder as it nears.
 */
function statusLine(m, loggedHours) {
  if (m.done_at) {
    return {
      tone: 'text-money',
      text: `Done ${formatEntryDate(toISODate(new Date(m.done_at)))}`,
    }
  }

  const goal = Number(m.target_hours) || 0
  if (goal > 0 && loggedHours >= goal) {
    return { tone: 'text-money', text: 'Hours goal reached — tick it off' }
  }

  if (!m.due_date) return { tone: 'text-faint', text: 'No due date' }

  const days = daysUntil(m.due_date)
  if (days < 0) {
    return { tone: 'text-over', text: `Overdue · was due ${formatEntryDate(m.due_date)}` }
  }
  if (days === 0) return { tone: 'text-warn', text: 'Due today' }
  return {
    tone: days <= 7 ? 'text-warn' : 'text-muted',
    text: `Due ${formatEntryDate(m.due_date)} · ${plural(days, 'day')} left`,
  }
}

function MilestoneRow({ milestone: m, loggedHours, onEdit, onToggle }) {
  const done = Boolean(m.done_at)
  const goal = Number(m.target_hours) || 0
  const status = statusLine(m, loggedHours)

  return (
    <li className="flex items-stretch">
      {/* The check sits outside the edit button so the two controls never
          nest — same split as the activity feed's delete. */}
      <button
        type="button"
        onClick={() => onToggle(m)}
        aria-pressed={done}
        aria-label={done ? `Mark ${m.title} as not done` : `Mark ${m.title} as done`}
        className="flex shrink-0 items-start py-3.5 pr-1 pl-3.5"
      >
        <span
          className={`flex size-6 items-center justify-center rounded-full border-2 transition-colors ${
            done ? 'border-money bg-money text-white' : 'border-line text-transparent'
          }`}
        >
          <Check size={13} strokeWidth={3} />
        </span>
      </button>

      <button
        type="button"
        onClick={() => onEdit(m)}
        aria-label={`Edit ${m.title}`}
        className="flex min-w-0 flex-1 items-start gap-2 py-3.5 pr-3.5 pl-2 text-left transition-colors active:bg-surface-2"
      >
        <div className="min-w-0 flex-1">
          <p
            className={`text-[14px] font-semibold leading-snug ${
              done ? 'text-muted line-through decoration-faint' : ''
            }`}
          >
            {m.title}
          </p>
          <p className={`mt-0.5 text-[12.5px] leading-snug ${status.tone}`}>
            {status.text}
          </p>

          {goal > 0 && !done ? (
            <div className="mt-2">
              <Meter
                percent={(loggedHours / goal) * 100}
                tone={loggedHours >= goal ? 'money' : 'brand'}
                label={`${m.title} hours progress`}
              />
              <p className="mt-1 text-[11.5px] tabular-nums text-faint">
                {round(Math.min(loggedHours, goal))}h of {round(goal)}h
              </p>
            </div>
          ) : null}
        </div>
        <Pencil size={13} className="mt-1 shrink-0 text-faint" />
      </button>
    </li>
  )
}

/**
 * Quarter marks on the way to the target. A reached badge carries the day it
 * was crossed; one still ahead carries an estimate at the current pace, marked
 * with "~" so it never reads as a promise.
 */
function HourBadge({ badge }) {
  const reached = Boolean(badge.reachedOn)

  return (
    <div
      className={`flex flex-col items-center rounded-2xl px-1 py-2.5 text-center ${
        reached ? 'bg-brand-soft' : 'bg-surface-2'
      }`}
    >
      <span
        className={`flex size-7 items-center justify-center rounded-full ${
          reached ? 'bg-brand text-white' : 'border border-dashed border-faint text-faint'
        }`}
      >
        {reached ? <Check size={13} strokeWidth={3} /> : <Trophy size={12} />}
      </span>
      <p className="mt-1.5 text-[13px] font-bold leading-none">{badge.percent}%</p>
      <p className="mt-1 text-[11px] leading-none text-muted">{formatHours(badge.hours)}</p>
      <p
        className={`mt-1 text-[10.5px] leading-none ${
          reached ? 'font-semibold text-brand' : 'text-faint'
        }`}
      >
        {reached
          ? shortDate(badge.reachedOn)
          : badge.projectedOn
            ? `~${shortDate(badge.projectedOn)}`
            : '—'}
      </p>
    </div>
  )
}

export function MilestonesCard({
  milestones,
  badges,
  loggedHours,
  avgPerDay,
  onAdd,
  onEdit,
  onToggle,
}) {
  const estimating = badges.some((b) => !b.reachedOn && b.projectedOn)

  return (
    <section
      className="animate-rise overflow-hidden rounded-3xl bg-surface shadow-card"
      style={{ animationDelay: '210ms' }}
    >
      {milestones.length === 0 ? (
        <div className="flex items-center gap-3 px-3.5 py-3.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Flag size={17} />
          </span>
          <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-muted">
            Add checkpoints like your orientation, midterm evaluation or final
            report.
          </p>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-soft px-3 py-1.5 text-[12.5px] font-semibold text-brand active:brightness-95"
          >
            <Plus size={13} />
            Add
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {milestones.map((m) => (
            <MilestoneRow
              key={m.id}
              milestone={m}
              loggedHours={loggedHours}
              onEdit={onEdit}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}

      {/* Badges need a target to be quarters of — a job with 0 target hours
          shows only the checkpoints. */}
      {badges.length > 0 ? (
        <div className="border-t border-line px-3.5 pt-3 pb-3.5">
          <h3 className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.09em] text-faint">
            <Trophy size={13} className="text-brand" />
            Hour badges
          </h3>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {badges.map((b) => (
              <HourBadge key={b.percent} badge={b} />
            ))}
          </div>
          {estimating ? (
            <p className="mt-2 text-[11.5px] leading-snug text-faint">
              ~ dates are estimates at your average of {round(avgPerDay)}h per
              day worked, weekdays only.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
