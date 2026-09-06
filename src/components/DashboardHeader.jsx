import { Download, Settings } from 'lucide-react'

/**
 * Greeting, avatar and the two page-level actions.
 *
 * The greeting moves with the clock because this app is opened at the two ends
 * of a shift, and "Welcome back" at 6am read like a form letter. The avatar
 * carries the brand gradient; the actions are quiet on purpose, so the only
 * thing competing for attention up here is the hero card below.
 */
function greeting(date = new Date()) {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardHeader({ name, initial, onExport, onSettings }) {
  return (
    <header className="relative flex items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-4">
      {/* A wash of the brand tint behind the header, fading into the canvas —
          it stops the page from starting on bare grey and hands off into the
          hero card. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-24 -z-10 h-56 bg-gradient-to-b from-brand-soft to-transparent"
      />

      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-hero text-[16px] font-bold text-white shadow-hero">
          {initial}
        </span>
        <div className="min-w-0">
          <p className="text-[12.5px] leading-tight text-muted">{greeting()}</p>
          <h1 className="truncate text-[19px] font-bold leading-tight tracking-tight">
            {name}
          </h1>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {onExport ? (
          <button
            type="button"
            onClick={onExport}
            aria-label="Export"
            className="rounded-full bg-surface p-2.5 text-muted shadow-card transition active:brightness-95"
          >
            <Download size={19} />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onSettings}
          aria-label="Settings"
          className="rounded-full bg-surface p-2.5 text-muted shadow-card transition active:brightness-95"
        >
          <Settings size={19} />
        </button>
      </div>
    </header>
  )
}
