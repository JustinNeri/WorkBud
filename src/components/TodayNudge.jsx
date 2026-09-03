import { useState } from 'react'
import { BellRing, X } from 'lucide-react'

const dismissKey = (jobId) => `wb-nudge-${jobId}`

/**
 * "You haven't logged today." A missed day is unrecoverable — nobody
 * reconstructs a time-in from memory a week later — so the nudge is worth the
 * space. Dismissing it is remembered per job for the rest of the day.
 *
 * Mounted with key={jobId}, so the initial read below re-runs per job without
 * needing an effect.
 */
export function TodayNudge({ jobId, loggedToday, onLog }) {
  const [dismissed, setDismissed] = useState(() => {
    // localStorage throws in some privacy modes; a nudge is never worth a crash.
    try {
      return localStorage.getItem(dismissKey(jobId)) === new Date().toDateString()
    } catch {
      return false
    }
  })

  if (loggedToday || dismissed) return null

  function dismiss() {
    setDismissed(true)
    try {
      localStorage.setItem(dismissKey(jobId), new Date().toDateString())
    } catch {
      /* nothing to do — it just reappears next load */
    }
  }

  return (
    <div className="animate-rise flex items-center gap-3 rounded-2xl bg-brand-soft px-3.5 py-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-white">
        <BellRing size={15} />
      </span>
      <p className="flex-1 text-[13px] leading-snug">
        <span className="font-semibold">Nothing logged today.</span>{' '}
        <button type="button" onClick={onLog} className="font-semibold text-brand underline">
          Log it now
        </button>
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded-lg p-1.5 text-muted"
      >
        <X size={15} />
      </button>
    </div>
  )
}
