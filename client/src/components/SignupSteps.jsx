import { Check } from 'lucide-react'

const STEPS = ['Account', 'Verify', 'Set up']

/**
 * The three stops between "Sign up" and a working dashboard, shown on all
 * three screens so the flow reads as one journey.
 *
 * The old signup gave no hint that a code and a setup form were still coming —
 * it looked identical to sign-in, so the OTP screen arrived as a surprise and
 * the setup form after it felt like the app was stalling. Naming the stops up
 * front is most of the difference between the two flows.
 *
 * One palette, not two: these used to carry a second white-on-gradient tone
 * for when the auth headings sat on the purple panel. The headings moved to the
 * light column beside it, so that tone had no caller left.
 *
 * @param {{current: 1|2|3}} props
 */
export function SignupSteps({ current }) {
  return (
    <ol
      className="flex items-center gap-2"
      aria-label={`Step ${current} of ${STEPS.length}: ${STEPS[current - 1]}`}
    >
      {STEPS.map((label, i) => {
        const n = i + 1
        const done = n < current
        const active = n === current

        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <span
                className={`h-1 rounded-full transition-colors ${
                  done || active ? 'bg-brand' : 'bg-surface-2'
                }`}
              />
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-semibold tracking-wide ${
                  active ? 'text-brand' : 'text-faint'
                }`}
              >
                {done ? <Check size={11} strokeWidth={3} /> : null}
                {label}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
