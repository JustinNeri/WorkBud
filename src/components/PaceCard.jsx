import { AlertTriangle, CalendarClock, TrendingDown, TrendingUp } from 'lucide-react'
import { daysUntil, formatMoney } from '../lib/format'

const round = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

/**
 * Answers the two questions the meters can't: will I finish, and what has this
 * cost me. Each half hides itself until the job carries the data it needs, so
 * an unpaid placement with no deadline shows nothing rather than zeros.
 */
export function PaceCard({
  deadline,
  weekdaysLeft,
  requiredPerDay,
  behind,
  deadlinePassed,
  complete,
  hourlyRate,
  earned,
  spentAllTime,
  net,
  costPerHour,
}) {
  const showPace = Boolean(deadline) && !complete
  const showCost = spentAllTime > 0 || hourlyRate > 0
  if (!showPace && !showCost) return null

  const daysLeft = deadline ? daysUntil(deadline) : null
  const paid = hourlyRate > 0

  return (
    <section
      className="animate-rise flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-card"
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
            <p className="mt-0.5 text-[12.5px] leading-snug text-muted">
              {deadlinePassed
                ? 'Hours are still short. Push the deadline or log what you missed.'
                : `${weekdaysLeft} weekday${weekdaysLeft === 1 ? '' : 's'} left · ${
                    daysLeft
                  } day${daysLeft === 1 ? '' : 's'} until the deadline`}
            </p>
            {behind && !deadlinePassed ? (
              <p className="mt-1 text-[12.5px] font-medium text-warn">
                That&apos;s above your current average — you&apos;re behind pace.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {showPace && showCost ? <div className="h-px bg-line" /> : null}

      {showCost ? (
        <div className="flex items-start gap-2.5">
          <span
            className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
              paid && net >= 0
                ? 'bg-money-soft text-money'
                : 'bg-over-soft text-over'
            }`}
          >
            {paid && net >= 0 ? <TrendingUp size={17} /> : <TrendingDown size={17} />}
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold leading-tight">
              {paid
                ? `${formatMoney(net)} net`
                : `${formatMoney(spentAllTime)} out of pocket`}
            </p>
            <p className="mt-0.5 text-[12.5px] leading-snug text-muted">
              {paid
                ? `${formatMoney(earned)} earned · ${formatMoney(spentAllTime)} spent`
                : 'Unpaid placement — this is what getting there has cost you.'}
            </p>
            {costPerHour > 0 ? (
              <p className="mt-1 text-[12.5px] text-faint">
                {formatMoney(costPerHour)} spent per hour worked
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}
