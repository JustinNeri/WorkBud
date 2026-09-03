import { AlertTriangle, TrendingUp, Wallet } from 'lucide-react'
import { formatMoney, formatMonth } from '../lib/format'
import { Meter } from './Meter'

/**
 * Spending against this month's budget.
 *
 * The meter's fill carries severity (money → warn → over). Status is never
 * colour alone: each state also ships an icon and a sentence.
 */
export function BudgetCard({ spent, budget, remaining, percent, over }) {
  const near = !over && percent >= 80
  const tone = over ? 'over' : near ? 'warn' : 'money'

  const status = over
    ? {
        icon: AlertTriangle,
        className: 'text-over',
        text: `${formatMoney(Math.abs(remaining))} over budget`,
      }
    : near
      ? {
          icon: TrendingUp,
          className: 'text-warn',
          text: `${formatMoney(remaining)} left — running close`,
        }
      : {
          icon: null,
          className: 'text-muted',
          text: `${formatMoney(remaining)} left this month`,
        }

  const StatusIcon = status.icon

  return (
    <section
      className="animate-rise rounded-2xl bg-surface p-4 shadow-card"
      style={{ animationDelay: '70ms' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-surface-2 text-muted">
            <Wallet size={17} />
          </span>
          <div>
            <h2 className="text-[14px] font-semibold leading-tight">Budget</h2>
            <p className="text-[12px] leading-tight text-faint">{formatMonth()}</p>
          </div>
        </div>
        <span className="text-[12px] font-semibold text-muted">
          {Math.round(percent)}%
        </span>
      </div>

      <div className="mt-3.5 flex items-baseline gap-1.5">
        <span className="text-[27px] font-bold leading-none tracking-tight">
          {formatMoney(spent)}
        </span>
        <span className="text-[13px] text-muted">
          of {formatMoney(budget, { compact: true })}
        </span>
      </div>

      <div className="mt-3">
        <Meter percent={percent} tone={tone} label="Budget used" />
      </div>

      <p
        className={`mt-2.5 flex items-center gap-1.5 text-[13px] font-medium ${status.className}`}
      >
        {StatusIcon ? <StatusIcon size={14} /> : null}
        {status.text}
      </p>
    </section>
  )
}
