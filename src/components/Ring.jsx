/**
 * A ratio drawn as an arc rather than a bar.
 *
 * The dashboard leads with one number — hours against target — and a 10px bar
 * gave the app's whole reason for existing the same visual weight as a form
 * field. A ring holds the figure inside it, so the number and its progress are
 * one object instead of two stacked ones.
 *
 * Geometry: the track and the fill share a circle, the fill drawn with
 * stroke-dasharray so it grows clockwise from 12 o'clock. `pathLength="100"`
 * lets the dash values be plain percentages instead of circumference maths,
 * which keeps this honest when the size prop changes.
 */
export function Ring({
  percent,
  size = 176,
  stroke = 14,
  tone = 'hero',
  label,
  children,
}) {
  const pct = Math.max(0, Math.min(100, percent))
  const radius = (size - stroke) / 2

  const tones = {
    hero: { track: 'rgba(255,255,255,0.22)', fill: '#ffffff' },
    brand: { track: 'var(--wb-brand-track)', fill: 'var(--wb-brand)' },
    money: { track: 'var(--wb-money-track)', fill: 'var(--wb-money)' },
  }
  const { track, fill } = tones[tone]

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        /* -90deg puts 0% at the top; without it the arc starts at 3 o'clock. */
        style={{ transform: 'rotate(-90deg)' }}
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={track}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={fill}
          strokeWidth={stroke}
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray="100"
          /* A round cap at 0 would still paint a dot and misread as progress. */
          strokeDashoffset={100 - (pct === 0 ? 0 : Math.max(pct, 1.5))}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  )
}
