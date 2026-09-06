import { CalendarCheck, Gauge, Timer } from 'lucide-react'

/**
 * The supporting hours figures, under the hero that carries the headline.
 *
 * These are all hours, so they wear the hours colour — a reader scanning the
 * page should be able to tell what a card is about before reading a word of
 * it. Values use proportional figures; they're standalone, not a column.
 */
function Tile({ icon: Icon, label, value, unit, delay }) {
  return (
    <div
      className="animate-rise flex-1 rounded-2xl bg-brand-soft px-3 py-3"
      style={{ animationDelay: delay }}
    >
      <span className="flex size-7 items-center justify-center rounded-lg bg-surface/70 text-brand">
        <Icon size={14} />
      </span>
      <p className="mt-2 flex items-baseline gap-0.5">
        <span className="text-[20px] font-bold leading-none tracking-tight text-ink">
          {value}
        </span>
        {unit ? (
          <span className="text-[12px] font-semibold text-brand">{unit}</span>
        ) : null}
      </p>
      <p className="mt-1 text-[11.5px] font-medium leading-tight text-muted">
        {label}
      </p>
    </div>
  )
}

const round = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

export function StatTiles({ weekHours, avgPerDay, daysWorked }) {
  return (
    <div className="flex gap-2.5">
      <Tile
        icon={Timer}
        label="This week"
        value={round(weekHours)}
        unit="h"
        delay="110ms"
      />
      <Tile
        icon={Gauge}
        label="Avg / day"
        value={round(avgPerDay)}
        unit="h"
        delay="150ms"
      />
      <Tile
        icon={CalendarCheck}
        label="Days in"
        value={daysWorked}
        delay="190ms"
      />
    </div>
  )
}
