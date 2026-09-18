import { ArrowLeft, CalendarCheck, Clock, Wallet } from 'lucide-react'
import { Logo } from './Logo'
import { Ring } from './Ring'
import { SignupSteps } from './SignupSteps'

/**
 * The frame every screen before the dashboard sits in — sign-in, signup, the
 * code step, the reset flow and onboarding.
 *
 * It used to be one centred card on a full-bleed purple gradient. On a phone
 * that reads fine; on a monitor it was a small white box marooned in a field of
 * colour, which is the layout every generated login page lands on. The gradient
 * is now a panel that holds something — the product's own ring and a plain
 * account of what the app does — and the form sits on a light column beside it
 * at its natural width instead of being centred in emptiness.
 *
 * Below lg the brand panel drops away entirely and this is the single mobile
 * column it always was, keeping the brand tint only as the same header wash the
 * dashboard opens with, so signing in and using the app look like one product.
 */

/**
 * What the app actually does, in the user's terms. Specific on purpose: the
 * generic version of this list ("Powerful. Simple. Secure.") says nothing a
 * reader can check, and reads as filler.
 */
const PROOF = [
  {
    icon: Clock,
    title: 'The day you just worked',
    body: 'Time in, time out, the unpaid break. The hours add themselves up.',
  },
  {
    icon: Wallet,
    title: 'What getting there cost',
    body: 'Fares, lunch, printing — itemised per day, against a cap you set.',
  },
  {
    icon: CalendarCheck,
    title: 'The total your school asks for',
    body: 'Export a clean time log for your coordinator whenever it falls due.',
  },
]

/**
 * The gradient half, desktop only.
 *
 * The preview is built from the real Ring component rather than a screenshot,
 * so it can never drift from what the dashboard actually renders. It is
 * decorative and illustrative, so the whole block is hidden from screen
 * readers — Ring reports a progressbar role, and an example figure announced as
 * live progress would be a lie.
 */
function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-hero text-hero-ink lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:justify-between lg:p-10 xl:p-14">
      {/* Blurred blooms so the gradient has depth instead of reading as a flat
          fill. Same device as the dashboard's hero card. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 -right-24 size-96 rounded-full bg-white/12 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-28 size-96 rounded-full bg-white/10 blur-3xl"
      />

      <div className="relative flex items-center gap-2.5">
        <Logo size={30} tone="hero" />
        <span className="text-[19px] font-bold tracking-tight">WorkBud</span>
      </div>

      <div className="relative my-10">
        <h2 className="max-w-[15ch] text-[34px] font-bold leading-[1.1] tracking-tight xl:text-[40px]">
          Every hour and every peso, in one place.
        </h2>
        <p className="mt-4 max-w-[38ch] text-[15px] leading-relaxed opacity-85">
          Log the day you just worked and WorkBud keeps the running total your
          school actually asks for — plus an honest picture of what the
          placement is costing you.
        </p>

        <div
          aria-hidden="true"
          className="mt-9 max-w-sm rounded-[26px] bg-white/10 p-5 ring-1 ring-white/15 backdrop-blur-sm"
        >
          <div className="flex items-center gap-5">
            <Ring percent={41} size={104} stroke={10}>
              <span className="text-[23px] font-bold leading-none tracking-tight">
                198
              </span>
              <span className="mt-1 text-[10.5px] font-medium opacity-75">
                of 486 h
              </span>
            </Ring>

            <dl className="min-w-0 flex-1 space-y-2.5">
              {[
                ['This week', '22h'],
                ['Avg / day', '7.4h'],
                ['Out of pocket', '₱1,410'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-3">
                  <dt className="truncate text-[12px] opacity-70">{label}</dt>
                  <dd className="text-[14px] font-bold tracking-tight">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="mt-4 border-t border-white/15 pt-3 text-[11.5px] opacity-60">
            A placement in progress.
          </p>
        </div>
      </div>

      <ul className="relative space-y-5">
        {PROOF.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex items-start gap-3.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <Icon size={17} />
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold leading-tight">{title}</p>
              <p className="mt-1 text-[13px] leading-snug opacity-75">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  )
}

export function AuthShell({ title, subtitle, step = null, onBack, footer, children }) {
  return (
    <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <BrandPanel />

      <div className="relative flex min-h-dvh flex-col px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] lg:min-h-0 lg:px-10 lg:py-12 xl:px-14">
        {/* Phones get the brand as the same wash the dashboard header opens
            with, rather than a gradient covering the whole screen. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-24 h-56 bg-gradient-to-b from-brand-soft to-transparent lg:hidden"
        />

        {/* justify-center rather than a centred flex parent: content that grows
            past the viewport gets its top clipped with no way to scroll up to
            it, and the signup card is the tall one. */}
        <div className="relative mx-auto flex w-full max-w-[25rem] flex-1 flex-col justify-center">
          <div className="mb-8 flex items-center gap-3 lg:mb-0">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                aria-label="Back"
                className="-ml-1.5 cursor-pointer rounded-full p-1.5 text-muted transition hover:bg-surface-2 hover:text-ink active:bg-surface-2"
              >
                <ArrowLeft size={20} />
              </button>
            ) : null}
            {/* The panel beside it already carries the mark on desktop. */}
            <div className="flex items-center gap-2 lg:hidden">
              <Logo size={25} tone="brand" />
              <span className="text-[17px] font-bold tracking-tight">WorkBud</span>
            </div>
          </div>

          <div className="lg:mt-0">
            <h1 className="text-[27px] font-bold leading-[1.15] tracking-tight lg:text-[30px]">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 max-w-[34ch] text-[14.5px] leading-snug text-muted">
                {subtitle}
              </p>
            ) : null}

            {step ? (
              <div className="mt-6">
                <SignupSteps current={step} />
              </div>
            ) : null}
          </div>

          <div className="mt-6 rounded-[26px] bg-surface p-5 shadow-card sm:p-6">
            {children}
          </div>

          {footer ? (
            <div className="mt-5 text-center text-[12.5px] leading-snug text-faint">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
