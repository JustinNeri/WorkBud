import { useEffect, useState } from 'react'
import { LogIn, LogOut, Play, Square } from 'lucide-react'
import { formatElapsed, formatTime, shiftStartedAt } from '../lib/format'
import { Alert } from './ui'

/** Ticks once a second while a shift runs; unmounted otherwise, so idle costs nothing. */
function Elapsed({ startedAt }) {
  const [seconds, setSeconds] = useState(() => (Date.now() - startedAt) / 1000)

  useEffect(() => {
    const id = setInterval(() => setSeconds((Date.now() - startedAt) / 1000), 1000)
    return () => clearInterval(id)
  }, [startedAt])

  return (
    <span className="text-[34px] font-bold leading-none tracking-tight tabular-nums">
      {formatElapsed(seconds)}
    </span>
  )
}

/**
 * One tap in, one tap out — so the DTR carries times that were observed
 * rather than remembered.
 */
export function ClockCard({
  openShift,
  activeJobId,
  jobName,
  otherJobName,
  busy,
  error,
  onClockIn,
  onClockOut,
  onCancel,
}) {
  const running = Boolean(openShift)
  const onThisJob = running && openShift.job_id === activeJobId

  // Clocked in somewhere else: offer the way out, not a second clock-in.
  if (running && !onThisJob) {
    return (
      <section className="animate-rise rounded-2xl bg-warn-soft p-4">
        <p className="text-[13.5px] leading-snug">
          You&apos;re clocked in on{' '}
          <span className="font-semibold">{otherJobName}</span>. Clock out there
          before starting here.
        </p>
        <button
          type="button"
          onClick={onClockOut}
          disabled={busy}
          className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-warn px-4 text-[14px] font-semibold text-white disabled:opacity-50"
        >
          <Square size={15} />
          Clock out of {otherJobName}
        </button>
        <Alert>{error}</Alert>
      </section>
    )
  }

  if (!running) {
    return (
      <section className="animate-rise flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-card">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <LogIn size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold leading-tight">Not clocked in</p>
          <p className="mt-0.5 truncate text-[12.5px] text-muted">
            Start the clock when you arrive at {jobName}.
          </p>
          <Alert>{error}</Alert>
        </div>
        <button
          type="button"
          onClick={onClockIn}
          disabled={busy}
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-hero px-4 text-[14px] font-semibold text-white shadow-hero transition active:scale-95 disabled:opacity-50"
        >
          <Play size={15} />
          Clock in
        </button>
      </section>
    )
  }

  const startedAt = shiftStartedAt(openShift.entry_date, openShift.time_in).getTime()

  return (
    <section className="animate-rise overflow-hidden rounded-2xl bg-surface p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-money">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-money opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-money" />
          </span>
          On the clock
        </span>
        <span className="text-[12.5px] text-muted">
          since {formatTime(openShift.time_in)}
        </span>
      </div>

      <div className="mt-3">
        <Elapsed startedAt={startedAt} />
      </div>

      <Alert>{error}</Alert>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onClockOut}
          disabled={busy}
          className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-hero text-[14px] font-semibold text-white shadow-hero transition active:scale-95 disabled:opacity-50"
        >
          <LogOut size={16} />
          Clock out
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="h-11 shrink-0 rounded-xl bg-surface-2 px-4 text-[14px] font-semibold text-muted transition active:brightness-95 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </section>
  )
}
