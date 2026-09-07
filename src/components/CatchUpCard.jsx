import { PiggyBank } from 'lucide-react'
import { formatMoney, formatMonth } from '../lib/format'

/**
 * What to do about a day that went over — the only part of the budget that a
 * user can still act on.
 *
 * Going over is already reported in three places; none of them tell you what
 * it takes to come back. This spreads the overspend across the days the month
 * has left and names the daily figure that clears it, so the state reads as a
 * plan with a number rather than a verdict. Tone is deliberate: this is the
 * card someone sees on a bad day, so it carries the savings colour and a
 * piggy bank, not a red warning.
 */
export function CatchUpCard({
  overspent,
  perDay,
  target,
  dailyBudget,
  daysLeft,
  canCatchUp,
}) {
  if (!(overspent > 0) || !(dailyBudget > 0)) return null

  const days = `${daysLeft} day${daysLeft === 1 ? '' : 's'}`
  // What a no-spend rest of the month would still leave outstanding.
  const shortfall = overspent - dailyBudget * daysLeft

  return (
    <section
      className="animate-rise flex items-start gap-2.5 rounded-3xl bg-surface p-4 shadow-card"
      style={{ animationDelay: '80ms' }}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-money-soft text-money">
        <PiggyBank size={17} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold leading-tight">
          {canCatchUp
            ? `Save ${formatMoney(perDay)} a day to catch up`
            : `${formatMoney(overspent)} to make back`}
        </p>

        <p className="mt-0.5 text-[12.5px] leading-snug text-muted">
          {canCatchUp ? (
            <>
              You&apos;re {formatMoney(overspent)} above your daily budget this
              month. Spend up to{' '}
              <span className="font-semibold text-money">
                {formatMoney(target)}
              </span>{' '}
              a day instead of {formatMoney(dailyBudget, { compact: true })} for
              the {days} left in {formatMonth()} and you finish level.
            </>
          ) : (
            <>
              More than the {days} left in {formatMonth()} can absorb — even
              spending nothing leaves {formatMoney(shortfall)}. Worth setting a
              cap you can keep next month rather than chasing this one.
            </>
          )}
        </p>
      </div>
    </section>
  )
}
