import { PieChart } from 'lucide-react'
import { categoryLabel, formatMoney } from '../lib/format'

/**
 * Where the money went, ranked.
 *
 * Comparing magnitude, so: horizontal bars in a single hue, sorted high→low,
 * each directly labelled. Not a pie — slice angles are far harder to compare
 * than bar lengths, and one hue per category would imply an identity the data
 * doesn't have.
 *
 * The single hue is the money green, not the brand purple: this is spending,
 * and drawing it in the hours colour made the two read as one thing.
 */
export function CategoryBreakdown({ totals }) {
  if (!totals.length) return null

  const grandTotal = totals.reduce((sum, t) => sum + t.amount, 0)
  if (grandTotal <= 0) return null

  const max = totals[0].amount

  return (
    <section
      className="animate-rise rounded-3xl bg-surface p-4 shadow-card"
      style={{ animationDelay: '200ms' }}
    >
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-xl bg-money-soft text-money">
          <PieChart size={17} />
        </span>
        <div>
          <h2 className="text-[14px] font-semibold leading-tight">Where it goes</h2>
          <p className="text-[12px] leading-tight text-muted">
            {formatMoney(grandTotal)} total
          </p>
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {totals.map(({ category, amount }) => {
          const share = Math.round((amount / grandTotal) * 100)
          return (
            <li key={category}>
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-semibold">
                  {categoryLabel(category)}
                </span>
                <span className="text-[13px] font-medium text-muted tabular-nums">
                  {formatMoney(amount)}
                  <span className="ml-1.5 text-faint">{share}%</span>
                </span>
              </div>
              {/* Bars share one hue: this is a single series, and length is
                  what carries the comparison. */}
              <div className="h-2.5 w-full overflow-hidden rounded-[5px] bg-money-track">
                <div
                  className="h-full rounded-r-[4px] bg-money"
                  style={{ width: `${Math.max((amount / max) * 100, 2)}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
