/**
 * The WorkBud mark: one zigzag that reads as the W and as a tracked line,
 * handing off from the hours stroke to the money stroke and finishing above
 * where it started.
 *
 * Inline rather than an <img> so it inherits currentColor where wanted and
 * costs no extra request on the one screen that renders before anything else
 * has loaded.
 *
 * `tone` picks the two stroke colours:
 *   'hero' — white + mint, for the purple gradient panel
 *   'brand' — brand gradient + money green, for canvas and surface
 */
export function Logo({ size = 40, tone = 'brand', className = '' }) {
  const hero = tone === 'hero'
  // Unique per tone, not per instance: two gradients with the same id would
  // collide, and a random id per render breaks SSR-style hydration matching.
  const gradientId = 'wb-logo-hours'

  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="WorkBud"
    >
      {hero ? null : (
        <defs>
          <linearGradient id={gradientId} x1="0.1" y1="0" x2="0.9" y2="1">
            <stop offset="0" stopColor="#4f46e5" />
            <stop offset="1" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
      )}
      <g
        fill="none"
        strokeWidth="56"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d="M104 182 L176 358 L256 254"
          stroke={hero ? '#ffffff' : `url(#${gradientId})`}
        />
        <path
          d="M256 254 L336 358 L408 142"
          stroke={hero ? '#6ee7b7' : '#059669'}
        />
      </g>
    </svg>
  )
}
