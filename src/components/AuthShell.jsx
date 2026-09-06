import { ArrowLeft } from 'lucide-react'
import { Logo } from './Logo'
import { SignupSteps } from './SignupSteps'

/**
 * The frame every screen before the dashboard sits in.
 *
 * Sign-in, signup, the code step, the reset flow and onboarding used to be
 * five separately-invented layouts — one had a gradient panel, the rest were
 * a form centred on grey — so the app looked like it changed hands between
 * screens. They now share one shell: the brand gradient owns the whole
 * viewport, and the form rides on a single card floating above it.
 *
 * The card is inset rather than full-bleed on purpose. A panel welded to the
 * bottom of the screen reads as a page; a card with gradient visible down both
 * sides reads as an object, and that difference is most of why the old screen
 * felt like a default form.
 */
export function AuthShell({
  badge,
  title,
  subtitle,
  step = null,
  onBack,
  footer,
  children,
}) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-hero text-hero-ink">
      {/* Blurred blooms so the gradient has depth instead of reading as a flat
          fill. Same device as the dashboard's hero card. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -right-20 size-80 rounded-full bg-white/12 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/3 -left-24 size-72 rounded-full bg-white/10 blur-3xl"
      />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-sm flex-col px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
        {/* my-auto rather than justify-center: centred flex content that grows
            past the viewport gets its top clipped with no way to scroll up to
            it, and the signup card is the tall one. */}
        <div className="my-auto w-full">
          <div className="flex items-center gap-3">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                aria-label="Back"
                className="-ml-1.5 rounded-full p-1.5 text-hero-ink/85 transition active:bg-white/15"
              >
                <ArrowLeft size={20} />
              </button>
            ) : null}
            <div className="flex items-center gap-2">
              <Logo size={26} tone="hero" />
              <span className="text-[17px] font-bold tracking-tight">WorkBud</span>
            </div>
          </div>

          <div className="mt-7">
            {badge ? (
              <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11.5px] font-semibold">
                {badge}
              </span>
            ) : null}

            <h1 className="text-[27px] font-bold leading-[1.15] tracking-tight">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1.5 max-w-[19rem] text-[14px] leading-snug opacity-85">
                {subtitle}
              </p>
            ) : null}

            {step ? (
              <div className="mt-5">
                <SignupSteps current={step} tone="hero" />
              </div>
            ) : null}
          </div>

          <div className="mt-6 rounded-[28px] bg-surface p-5 text-ink shadow-float">
            {children}
          </div>

          {footer ? (
            <div className="mt-5 text-center text-[12.5px] leading-snug text-hero-ink/75">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
