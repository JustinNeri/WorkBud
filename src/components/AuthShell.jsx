import { ArrowLeft, CalendarCheck, Clock, Wallet } from 'lucide-react'
import { Logo } from './Logo'
import { SignupSteps } from './SignupSteps'

/**
 * The frame every screen before the dashboard sits in — sign-in, signup, the
 * code step, the reset flow and onboarding.
 *
 * It used to be one centred card on a full-bleed gradient. On a phone that
 * reads fine; on a monitor it was a small white box marooned in a field of
 * colour, which is the layout every generated login page lands on. The
 * gradient is now a panel that says what the app is, and the form sits on a
 * clean column beside it at its natural width.
 *
 * There is deliberately no mock dashboard here. An earlier version showed a
 * ring reading "198 of 486 h" beside invented weekly figures, and invented
 * numbers on a sign-in page are worse than no numbers: they are the first
 * thing a reader checks, they cannot be true for the person reading them, and
 * they make the page look like a template with the sample data left in.
 *
 * Below lg the brand panel drops away entirely and this is the single mobile
 * column it always was, keeping the brand only as the same header wash the
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
 * Three bands — mark, message, attribution — with the message block holding
 * the headline and the proof list together. Spreading those two apart left a
 * long empty channel down the middle of the panel, which is what made the
 * first version look unfinished.
 */
function BrandPanel() {
  return (
    <aside className="bg-auth relative hidden overflow-hidden text-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:justify-between lg:p-12 xl:p-16">
      <div
        aria-hidden="true"
        className="bg-auth-dots pointer-events-none absolute inset-0 [mask-image:radial-gradient(75%_65%_at_25%_25%,black,transparent)]"
      />

      <div className="relative flex items-center gap-2.5">
        <Logo size={28} tone="hero" />
        <span className="text-[18px] font-bold tracking-tight">WorkBud</span>
      </div>

      <div className="relative max-w-[30rem]">
        <h2 className="text-[36px] font-bold leading-[1.08] tracking-[-0.02em] xl:text-[42px]">
          Every hour and every peso, in one place.
        </h2>
        <p className="mt-5 max-w-[42ch] text-[15px] leading-relaxed text-white/70">
          Log the day you just worked and WorkBud keeps the running total your
          school actually asks for — plus an honest picture of what the
          placement is costing you.
        </p>

        <ul className="mt-10 space-y-6 border-t border-white/15 pt-9">
          {PROOF.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex items-start gap-4">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                <Icon size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-[14.5px] font-semibold leading-tight">{title}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/60">
                  {body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-[12px] text-white/40">
        For OJT students, interns, and anyone still logging hours by hand.
      </p>
    </aside>
  )
}

export function AuthShell({ title, subtitle, step = null, onBack, footer, children }) {
  return (
    <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <BrandPanel />

      {/* White on desktop, canvas on a phone. The form is carried by a card on
          a phone and by the column itself on a monitor — a shadowed card on a
          near-white panel is a box inside a box, and it was the reason the
          right-hand side looked washed out rather than clean. */}
      <div className="relative flex min-h-dvh flex-col px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] lg:min-h-0 lg:bg-surface lg:px-12 lg:py-12 xl:px-16">
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

          <div>
            <h1 className="text-[27px] font-bold leading-[1.15] tracking-tight lg:text-[31px]">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2.5 max-w-[36ch] text-[14.5px] leading-snug text-muted">
                {subtitle}
              </p>
            ) : null}

            {step ? (
              <div className="mt-6">
                <SignupSteps current={step} />
              </div>
            ) : null}
          </div>

          <div className="mt-6 rounded-[26px] bg-surface p-5 shadow-card sm:p-6 lg:mt-8 lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none">
            {children}
          </div>

          {footer ? (
            <div className="mt-6 text-[12.5px] leading-snug text-faint max-lg:text-center">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
