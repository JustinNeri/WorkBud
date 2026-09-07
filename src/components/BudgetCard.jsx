import { AlertTriangle, TrendingUp, Wallet } from 'lucide-react'
import { formatMoney, formatMonth } from '../lib/format'
import { Meter } from './Meter'

/**
 * Spending against this month's budget.
 *
 * The card is tinted by state, not just the meter: money → warn → over. That
 * makes the one card people check in a hurry readable from arm's length, and
 * it keeps money visually separate from the purple hours cards above.
 * Status is never colour alone — each state also ships an icon and a sentence.
 */
export function BudgetCard({
  spent,
  budget,
  remaining,
  percent,
  over,
  dailyBudget,
  spentToday,
  dailyRemaining,
  overToday,
  daysOverThisMonth,
}) {
  const near = !over && percent >= 80
  const tone = over ? 'over' : near ? 'warn' : 'money'

  const skins = {
    money: { card: 'bg-money-soft', chip: 'bg-money text-white', accent: 'text-money' },
    warn: { card: 'bg-warn-soft', chip: 'bg-warn text-white', accent: 'text-warn' },
    over: { card: 'bg-over-soft', chip: 'bg-over text-white', accent: 'text-over' },
  }
  const skin = skins[tone]

  const status = over
    ? {
        icon: AlertTriangle,
        text: `${formatMoney(Math.abs(remaining))} over budget`,
      }
    : near
      ? { icon: TrendingUp, text: `${formatMoney(remaining)} left — running close` }
      : { icon: null, text: `${formatMoney(remaining)} left this month` }

  const StatusIcon = status.icon

  return (
    <section
      className={`animate-rise rounded-3xl p-4 ${skin.card}`}
      style={{ animationDelay: '70ms' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex size-9 items-center justify-center rounded-xl ${skin.chip}`}
          >
            <Wallet size={17} />
          </span>
          <div>
            <h2 className="text-[14px] font-semibold leading-tight">Budget</h2>
            <p className="text-[12px] leading-tight text-muted">{formatMonth()}</p>
          </div>
        </div>
        <span
          className={`rounded-full bg-surface/70 px-2.5 py-1 text-[12px] font-bold tabular-nums ${skin.accent}`}
        >
          {Math.round(percent)}%
        </span>
      </div>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="text-[32px] font-bold leading-none tracking-tight">
          {formatMoney(spent)}
        </span>
        <span className="text-[13px] font-medium text-muted">
          of {formatMoney(budget, { compact: true })}
        </span>
      </div>

      <div className="mt-3.5">
        <Meter percent={percent} tone={tone} label="Budget used" />
      </div>

      <p
        className={`mt-2.5 flex items-center gap-1.5 text-[13px] font-semibold ${skin.accent}`}
      >
        {StatusIcon ? <StatusIcon size={14} /> : null}
        {status.text}
      </p>

      {/* The daily cap, when the job sets one. It sits under the month rather
          than beside it: the month is the commitment, the day is the pace that
          keeps it — and a day over is worth seeing before the month tips.

          Amber, and no warning triangle: a day over budget is a thing to
          correct, not an emergency, and the catch-up card below already says
          how. The words carry the state, so nothing here depends on colour. */}
      {dailyBudget > 0 ? (
        <>
          <div className="mt-3 h-px bg-ink/10" />
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <p
              className={`flex items-center gap-1.5 text-[12.5px] font-semibold ${
                overToday ? 'text-warn' : 'text-muted'
              }`}
            >
              <Wallet size={13} />
              <span>
                Today {formatMoney(spentToday)} of{' '}
                {formatMoney(dailyBudget, { compact: true })}
                {overToday ? ` · ${formatMoney(-dailyRemaining)} over` : ''}
              </span>
            </p>
            {daysOverThisMonth > 0 ? (
              <span className="rounded-full bg-surface/70 px-2 py-0.5 text-[11.5px] font-semibold text-warn">
                {daysOverThisMonth} {daysOverThisMonth === 1 ? 'day' : 'days'} over
              </span>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  )
}
