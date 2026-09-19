import {
  AlertTriangle,
  CalendarClock,
  CalendarRange,
  CalendarX2,
} from 'lucide-react'
import { daysUntil, formatEntryDate, formatMoney } from '../lib/format'

const round = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1))
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

/**
 * Will I finish, and what has got in the way.
 *
 * Each row hides itself until the job carries the data it needs, so a
 * placement with no deadline and no days off shows nothing rather than zeros.
 *
 * "Will I finish" only means something for work that ends. A placement counts
 * down to its deadline; a job someone is simply employed in has no last day, so
 * for those the same slot reports the month so far and where it's heading —
 * the closest thing to a finish line an ongoing role has.
 *
 * This card used to carry a second half totalling what the placement had cost
 * out of pocket. It was removed on request: the money already has a whole
 * section of its own further down the page, and a running "this is what it has
 * cost you" under the pace figures read as editorial rather than useful.
 */
export function PaceCard({
  deadline,
  weekdaysLeft,
  requiredPerDay,
  behind,
  deadlinePassed,
  complete,
  ongoing,
  entryCount,
  daysAbsent = 0,
  monthHours,
  monthDaysWorked,
  monthEarned,
  projectedMonthHours,
  hourlyRate,
}) {
  const showPace = Boolean(deadline) && !complete
  // No deadline: an ongoing role gets the month instead, and a placement that
  // simply hasn't set one gets told where to set it. Both wait for a first
  // entry — a dashboard with nothing on it yet should stay quiet.
  const showMonth = !deadline && ongoing && entryCount > 0
  const showPrompt = !deadline && !ongoing && entryCount > 0
  const showAbsent = daysAbsent > 0
  if (!showPace && !showMonth && !showPrompt && !showAbsent) return null

  const daysLeft = deadline ? daysUntil(deadline) : null
  const paid = hourlyRate > 0
  const showDivider = showPace || showMonth || showPrompt

  return (
    <section
      className="animate-rise flex flex-col gap-3.5 rounded-3xl bg-surface p-4 shadow-card"
      style={{ animationDelay: '90ms' }}
    >
      {showPace ? (
        <div className="flex items-start gap-2.5">
          <span
            className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
              deadlinePassed
                ? 'bg-over-soft text-over'
                : behind
                  ? 'bg-warn-soft text-warn'
                  : 'bg-brand-soft text-brand'
            }`}
          >
            {deadlinePassed ? <AlertTriangle size={17} /> : <CalendarClock size={17} />}
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold leading-tight">
              {deadlinePassed
                ? 'Deadline passed'
                : requiredPerDay !== null
                  ? `${round(requiredPerDay)}h a day to finish`
                  : 'On track'}
            </p>
            {/* The date itself, not just a countdown: "65 days left" is a
                number to trust blindly, "Fri, Nov 14" is one to plan around. */}
            <p className="mt-0.5 text-[12.5px] leading-snug text-muted">
              {deadlinePassed
                ? `Deadline was ${formatEntryDate(deadline)} — push it in Edit job, or log the days you missed.`
                : `Deadline ${formatEntryDate(deadline)} · ${plural(daysLeft, 'day')} (${plural(
                    weekdaysLeft,
                    'weekday',
                  )}) left`}
            </p>
            {behind && !deadlinePassed ? (
              <p className="mt-1 text-[12.5px] font-medium text-warn">
                That&apos;s above your current average — you&apos;re behind pace.
              </p>
            ) : null}
          </div>
        </div>
      ) : showMonth ? (
        <div className="flex items-start gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <CalendarRange size={17} />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold leading-tight">
              {round(monthHours)}h this month
            </p>
            <p className="mt-0.5 text-[12.5px] leading-snug text-muted">
              {plural(monthDaysWorked, 'day')} logged
              {projectedMonthHours !== null
                ? ` · on pace for about ${round(projectedMonthHours)}h by month end`
                : ''}
            </p>
            {paid && monthEarned > 0 ? (
              <p className="mt-1 text-[12.5px] font-medium text-money">
                {formatMoney(monthEarned)} earned this month
              </p>
            ) : null}
          </div>
        </div>
      ) : showPrompt ? (
        <div className="flex items-start gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <CalendarClock size={17} />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold leading-tight">No end date set</p>
            <p className="mt-0.5 text-[12.5px] leading-snug text-muted">
              Add a deadline in Edit job and this card will show the hours a day
              you need to finish on time.
            </p>
          </div>
        </div>
      ) : null}

      {showDivider && showAbsent ? <div className="h-px bg-line" /> : null}

      {/* Days off, stated plainly rather than as a telling-off. They are the
          reason the expected finish moved, so saying so here closes the loop
          between the day that was missed and the date that slipped. */}
      {showAbsent ? (
        <div className="flex items-start gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-warn-soft text-warn">
            <CalendarX2 size={17} />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold leading-tight">
              {plural(daysAbsent, 'day')} not worked
            </p>
            <p className="mt-0.5 text-[12.5px] leading-snug text-muted">
              Logged as days off, so they appear in your DTR and are already
              built into the expected finish above.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  )
}
