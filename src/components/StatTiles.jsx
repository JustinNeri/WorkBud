/**
 * A KPI row of three plain figures — no plot, so no chart and no colour:
 * these are the supporting numbers, and the hero above is the headline.
 * Values use proportional figures; they're standalone, not a column.
 */
function Tile({ label, value, unit, delay }) {
  return (
    <div
      className="animate-rise flex-1 rounded-2xl bg-surface px-3 py-3 shadow-card"
      style={{ animationDelay: delay }}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-faint">
        {label}
      </p>
      <p className="mt-1 flex items-baseline gap-0.5">
        <span className="text-[19px] font-bold leading-none tracking-tight">
          {value}
        </span>
        {unit ? (
          <span className="text-[12px] font-medium text-muted">{unit}</span>
        ) : null}
      </p>
    </div>
  )
}

const round = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

export function StatTiles({ weekHours, avgPerDay, daysWorked }) {
  return (
    <div className="flex gap-2.5">
      <Tile label="This week" value={round(weekHours)} unit="h" delay="110ms" />
      <Tile label="Avg / day" value={round(avgPerDay)} unit="h" delay="150ms" />
      <Tile label="Days in" value={daysWorked} delay="190ms" />
    </div>
  )
}
