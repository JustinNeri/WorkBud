import { useState } from 'react'

/**
 * The user's picture, falling back to their initial on the brand gradient.
 *
 * The fallback is not only for "no photo set". A stored avatar can 404 — the
 * file was removed out from under the profile row, or the network dropped
 * mid-fetch — and a broken-image glyph where someone's face should be is a
 * worse failure than the initial they had before they uploaded anything. So a
 * load error falls back to exactly the same tile.
 */
export function Avatar({ src, initial, size = 44, className = '' }) {
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(src) && !failed

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-action font-bold text-white shadow-hero ${className}`}
      style={{
        width: size,
        height: size,
        // Tracks the tile rather than being fixed, so one component serves the
        // 44px header and the 72px settings row without a second size scale.
        fontSize: Math.round(size * 0.36),
      }}
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        initial
      )}
    </span>
  )
}
