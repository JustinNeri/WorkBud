/**
 * A single ratio against a limit.
 *
 * The track is a lighter step of the fill's own ramp (not neutral grey), so
 * the state reads across the whole bar. The fill has a 4px rounded data-end
 * and stays square at the baseline, the way a bar grows from an axis.
 */
const TONES = {
  brand: 'bg-brand',
  money: 'bg-money',
  warn: 'bg-warn',
  over: 'bg-over',
  hero: 'bg-white',
}

const TRACKS = {
  brand: 'bg-brand-track',
  money: 'bg-money-track',
  warn: 'bg-warn-track',
  over: 'bg-over-track',
  hero: 'bg-white/25',
}

export function Meter({ percent, tone = 'brand', label }) {
  const pct = Math.max(0, Math.min(100, percent))

  return (
    <div
      className={`h-2.5 w-full overflow-hidden rounded-[5px] ${TRACKS[tone]}`}
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-r-[4px] transition-[width] duration-700 ease-out ${TONES[tone]}`}
        /* a hairline of fill at 0 would misread as progress, so start at 0 */
        style={{ width: `${pct === 0 ? 0 : Math.max(pct, 2)}%` }}
      />
    </div>
  )
}
