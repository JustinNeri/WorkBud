import { useEffect, useRef, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'

// How far the finger has to drag the badge down before letting go refreshes,
// and where the badge stops following. The drag is halved so it feels weighted.
const THRESHOLD = 64
const MAX = 96
// Short enough not to feel slow, long enough that a fast reload still reads as
// having happened.
const MIN_SPIN_MS = 500

/**
 * Pull down at the top of the page to reload.
 *
 * The browser's own pull-to-refresh is switched off (overscroll-behavior on the
 * body, and an installed PWA on iOS never had one), so this draws its own. It
 * listens for touches only, which keeps it to phones and tablets without a
 * width check, and it stands down while a sheet has the page scroll-locked.
 */
export function PullToRefresh({ onRefresh }) {
  const [pull, setPull] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(null)
  const pullRef = useRef(0)
  const busy = useRef(false)

  useEffect(() => {
    const move = (value) => {
      pullRef.current = value
      setPull(value)
    }

    const onStart = (e) => {
      if (busy.current || e.touches.length !== 1) return
      if (window.scrollY > 0 || document.body.style.overflow === 'hidden') return
      startY.current = e.touches[0].clientY
    }

    const onMove = (e) => {
      if (startY.current == null) return
      // Scrolled away from the top mid-gesture: this is a scroll, not a pull.
      if (window.scrollY > 0) {
        startY.current = null
        setDragging(false)
        return move(0)
      }
      const dy = e.touches[0].clientY - startY.current
      setDragging(dy > 0)
      move(dy > 0 ? Math.min(MAX, dy * 0.5) : 0)
    }

    const onEnd = async () => {
      if (startY.current == null) return
      startY.current = null
      setDragging(false)

      if (pullRef.current < THRESHOLD) return move(0)

      busy.current = true
      setRefreshing(true)
      move(THRESHOLD)
      // Also ask for a newer build: the service worker otherwise keeps serving
      // the cached app until the next cold start.
      navigator.serviceWorker
        ?.getRegistration()
        .then((registration) => registration?.update())
        .catch(() => {})
      await Promise.all([
        onRefresh(),
        new Promise((resolve) => setTimeout(resolve, MIN_SPIN_MS)),
      ])
      busy.current = false
      setRefreshing(false)
      move(0)
    }

    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove', onMove, { passive: true })
    document.addEventListener('touchend', onEnd)
    document.addEventListener('touchcancel', onEnd)
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
      document.removeEventListener('touchcancel', onEnd)
    }
  }, [onRefresh])

  const ready = pull >= THRESHOLD

  return (
    <div
      aria-hidden={!refreshing}
      role="status"
      className="pointer-events-none fixed inset-x-0 top-[env(safe-area-inset-top)] z-40 flex justify-center"
    >
      <div
        // Parked just above the screen edge at rest, and following the finger
        // one to one while dragging; the transition is only for the way back.
        style={{
          transform: `translateY(${pull - 44}px)`,
          opacity: Math.min(1, pull / THRESHOLD),
        }}
        className={`flex size-9 items-center justify-center rounded-full bg-surface shadow-card ring-1 ring-line ${
          ready || refreshing ? 'text-brand' : 'text-muted'
        } ${dragging ? '' : 'transition-all duration-200'}`}
      >
        {refreshing ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span className="sr-only">Refreshing</span>
          </>
        ) : (
          <RefreshCw size={17} style={{ transform: `rotate(${pull * 3}deg)` }} />
        )}
      </div>
    </div>
  )
}
