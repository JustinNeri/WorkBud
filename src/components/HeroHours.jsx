import { Check, Clock } from 'lucide-react'
import { Meter } from './Meter'

/**
 * The single number this dashboard leads with — OJT hours logged.
 * Proportional figures, not tabular: at display sizes tabular-nums gives every
 * digit a zero's width and the number reads loose.
 */
export function HeroHours({ logged, target, remaining, percent, complete }) {
  const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, ''))

  return (
    <section className="animate-rise overflow-hidden rounded-3xl bg-hero p-5 text-hero-ink shadow-hero">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-white/20">
            <Clock size={15} />
          </span>
          <h2 className="text-[14px] font-semibold">OJT Progress</h2>
        </div>
        <span className="rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-semibold">
          {Math.round(percent)}%
        </span>
      </div>

      <div className="mt-5 flex items-baseline gap-1.5">
        <span className="text-[52px] font-bold leading-none tracking-tight">
          {fmt(logged)}
        </span>
        <span className="text-[19px] font-semibold opacity-80">h</span>
        <span className="ml-1 text-[14px] opacity-70">of {fmt(target)}h</span>
      </div>

      <div className="mt-4">
        <Meter percent={percent} tone="hero" label="OJT hours progress" />
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-[13px] opacity-90">
        {complete ? (
          <>
            <Check size={14} />
            Target reached — nice work.
          </>
        ) : (
          <>
            <span className="font-semibold">{fmt(remaining)}h</span> to go
          </>
        )}
      </p>
    </section>
  )
}
