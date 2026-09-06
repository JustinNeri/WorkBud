import { useState } from 'react'
import { Check, ChevronDown, Eye, EyeOff, Loader2 } from 'lucide-react'

const baseField =
  'w-full min-w-0 rounded-2xl border border-line bg-surface-2 px-4 py-3 text-ink placeholder:text-faint transition-colors focus:border-brand focus:bg-surface'

export function Field({ label, hint, children }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[13px] font-medium text-muted">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs text-faint">{hint}</span> : null}
    </label>
  )
}

/**
 * `icon` puts a leading glyph inside the box. On the auth screens it does real
 * work: at a glance the fields say "email" and "password" before the labels
 * are read, which is most of what stops a login form looking like a generic
 * pair of grey rectangles.
 */
export function TextInput({ icon: Icon, className = '', ...props }) {
  if (!Icon) return <input className={`${baseField} ${className}`} {...props} />

  return (
    // min-w-0 on the wrapper, not just the input: as a flex or grid child it
    // would otherwise floor at the control's min-content width — a number
    // input reserves ~20 characters — and push the row wider than the phone,
    // which is what made a sheet pan sideways.
    <div className="relative min-w-0">
      <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-faint">
        <Icon size={17} />
      </span>
      <input className={`${baseField} pl-11 ${className}`} {...props} />
    </div>
  )
}

/**
 * Password field with a reveal toggle — typing one blind on a phone keyboard
 * is where most sign-in failures actually come from.
 *
 * The toggle is type="button" on purpose: inside a form, a bare <button>
 * defaults to submit, so tapping the eye would try to sign the user in.
 */
export function PasswordInput({ icon: Icon, className = '', ...props }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative min-w-0">
      {Icon ? (
        <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-faint">
          <Icon size={17} />
        </span>
      ) : null}
      <input
        type={visible ? 'text' : 'password'}
        className={`${baseField} pr-12 ${Icon ? 'pl-11' : ''} ${className}`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted transition-colors active:text-ink"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )
}

/**
 * Numeric field. type="number" gives the decimal keypad on iOS; the leading
 * adornment ("$" / "h") sits inside the box so the row stays one tap target.
 */
export function NumberInput({ adornment, className = '', ...props }) {
  return (
    <div className="relative min-w-0">
      {adornment ? (
        <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted">
          {adornment}
        </span>
      ) : null}
      <input
        type="number"
        inputMode="decimal"
        className={`${baseField} ${adornment ? 'pl-8' : ''} ${className}`}
        {...props}
      />
    </div>
  )
}

/**
 * Native <select> with the platform arrow drawn back on.
 *
 * appearance-none is needed to make the box match the other fields, but it
 * also strips the arrow — leaving a control that looks like a text input and
 * gives no hint it opens a list. The chevron is decorative and pointer-events
 * none, so the whole box still opens the native picker.
 */
export function Select({ className = '', children, ...props }) {
  return (
    <div className="relative min-w-0">
      <select
        className={`${baseField} appearance-none pr-10 ${className}`}
        {...props}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-faint">
        <ChevronDown size={16} />
      </span>
    </div>
  )
}

export function TextArea({ className = '', ...props }) {
  return (
    <textarea
      rows={3}
      className={`${baseField} resize-none ${className}`}
      {...props}
    />
  )
}

export function Button({
  variant = 'primary',
  busy = false,
  className = '',
  children,
  ...props
}) {
  const variants = {
    primary: 'bg-hero text-white shadow-hero active:brightness-95',
    secondary: 'bg-surface-2 text-ink active:brightness-95',
    danger: 'bg-over text-white active:brightness-90',
    ghost: 'text-muted active:bg-surface-2',
  }

  return (
    <button
      className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold transition disabled:opacity-50 ${variants[variant]} ${className}`}
      disabled={busy || props.disabled}
      {...props}
    >
      {busy ? <Loader2 size={18} className="animate-spin" /> : children}
    </button>
  )
}

export function Alert({ tone = 'error', children }) {
  if (!children) return null
  const tones = {
    error: 'bg-over-soft text-over',
    info: 'bg-brand-soft text-brand',
  }
  return (
    <p className={`rounded-2xl px-3.5 py-3 text-[13px] leading-snug ${tones[tone]}`}>
      {children}
    </p>
  )
}

/**
 * Strength bar + the live rule checklist under a new-password field.
 *
 * Four segments rather than a percentage: a continuous bar invites people to
 * chase 100%, while four steps read as "this is enough" once the rules go
 * green. Colour carries the same information as the filled count, and the
 * rules are spelled out in text, so nothing here depends on seeing colour.
 */
export function PasswordMeter({ result }) {
  const { rules, score, label, problem } = result

  const fills = [
    'bg-over',
    'bg-over',
    'bg-warn',
    'bg-brand',
    'bg-money',
  ]
  const tones = [
    'text-over',
    'text-over',
    'text-warn',
    'text-brand',
    'text-money',
  ]

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1" aria-hidden="true">
          {[1, 2, 3, 4].map((n) => (
            <span
              key={n}
              className={`h-1 flex-1 rounded-full transition-colors ${
                score >= n ? fills[score] : 'bg-surface-2'
              }`}
            />
          ))}
        </div>
        {label ? (
          <span className={`text-[12px] font-semibold ${tones[score]}`}>
            {label}
          </span>
        ) : null}
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {rules.map((rule) => (
          <li
            key={rule.id}
            className={`inline-flex items-center gap-1 text-[12px] ${
              rule.ok ? 'text-money' : 'text-faint'
            }`}
          >
            {rule.ok ? (
              <Check size={12} strokeWidth={3} />
            ) : (
              <span aria-hidden="true" className="size-[5px] rounded-full bg-current" />
            )}
            {rule.label}
          </li>
        ))}
      </ul>

      {problem ? (
        <p className="mt-1.5 text-[12px] leading-snug text-over">{problem}</p>
      ) : null}
    </div>
  )
}

/**
 * A group heading in the dashboard's single column.
 *
 * The old page was one flat stack of nine identical cards, so nothing told the
 * reader where the hours end and the money starts. A coloured dot in the
 * domain's own hue, the label, and a rule running to the edge give the column
 * joints without adding another box.
 */
export function SectionHeading({ tone = 'brand', children, action }) {
  const dots = { brand: 'bg-brand', money: 'bg-money', neutral: 'bg-faint' }

  return (
    <div className="mt-4 mb-0.5 flex items-center gap-2 px-1 first:mt-0">
      <span className={`size-1.5 shrink-0 rounded-full ${dots[tone]}`} />
      <h2 className="shrink-0 text-[11.5px] font-bold uppercase tracking-[0.09em] text-muted">
        {children}
      </h2>
      <span className="h-px flex-1 bg-line" />
      {action}
    </div>
  )
}

/**
 * A labelled band inside a long form, separated by a rule rather than boxed.
 *
 * The log sheet had grown to eight standalone fields in a row, which on a
 * phone is a wall of identical rounded rectangles with no way in. Grouping
 * them under quiet headings gives the form structure without nesting another
 * container around controls that are already containers.
 */
export function FormSection({
  label,
  icon: Icon,
  tone = 'neutral',
  action,
  first = false,
  children,
}) {
  // Same two hues the dashboard sorts its cards by, so a band about money in
  // a form and a card about money on the dashboard are recognisably the pair.
  const tones = { brand: 'text-brand', money: 'text-money', neutral: 'text-faint' }

  return (
    <section className={first ? '' : 'border-t border-line pt-4'}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.09em] text-faint">
          {Icon ? <Icon size={13} className={tones[tone]} /> : null}
          {label}
        </h3>
        {action}
      </div>
      {children}
    </section>
  )
}
