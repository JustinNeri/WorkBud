import { Check, Clock } from 'lucide-react'
import { Ring } from './Ring'

/**
 * The single number this dashboard leads with — OJT hours logged.
 *
 * Proportional figures, not tabular: at display sizes tabular-nums gives every
 * digit a zero's width and the number reads loose.
 */
export function HeroHours({ logged, target, remaining, percent, complete }) {
  const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, ''))

  return (
    <section className="animate-rise relative overflow-hidden rounded-[28px] bg-hero px-5 pt-4 pb-5 text-hero-ink shadow-hero">
      {/* Two blurred blooms lift the flat gradient off the page — the same
          device the auth panel uses, so the app opens and continues alike. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -right-14 size-52 rounded-full bg-white/12 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-16 size-48 rounded-full bg-white/10 blur-2xl"
      />

      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-white/20">
              <Clock size={15} />
            </span>
            <h2 className="text-[14px] font-semibold">OJT Progress</h2>
          </div>
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-semibold tabular-nums">
            {Math.round(percent)}%
          </span>
        </div>

        <div className="mt-3 flex justify-center">
          <Ring percent={percent} size={158} stroke={13} label="OJT hours progress">
            <span className="text-[40px] font-bold leading-none tracking-tight">
              {fmt(logged)}
            </span>
            <span className="mt-1.5 text-[12.5px] font-medium opacity-75">
              of {fmt(target)} hours
            </span>
          </Ring>
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 rounded-full bg-white/12 py-2 text-[13px]">
          {complete ? (
            <>
              <Check size={14} />
              Target reached — nice work.
            </>
          ) : (
            <>
              <span className="font-bold">{fmt(remaining)}h</span>
              <span className="opacity-80">still to go</span>
            </>
          )}
        </p>
      </div>
    </section>
  )
}
