import { Loader2 } from 'lucide-react'

const baseField =
  'w-full rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-ink placeholder:text-faint transition-colors focus:border-brand focus:bg-surface'

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-muted">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs text-faint">{hint}</span> : null}
    </label>
  )
}

export function TextInput({ className = '', ...props }) {
  return <input className={`${baseField} ${className}`} {...props} />
}

/**
 * Numeric field. type="number" gives the decimal keypad on iOS; the leading
 * adornment ("$" / "h") sits inside the box so the row stays one tap target.
 */
export function NumberInput({ adornment, className = '', ...props }) {
  return (
    <div className="relative">
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
    primary: 'bg-brand text-white active:brightness-90',
    secondary: 'bg-surface-2 text-ink active:brightness-95',
    danger: 'bg-over text-white active:brightness-90',
    ghost: 'text-muted active:bg-surface-2',
  }

  return (
    <button
      className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-semibold transition disabled:opacity-50 ${variants[variant]} ${className}`}
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
    <p className={`rounded-xl px-3.5 py-3 text-[13px] leading-snug ${tones[tone]}`}>
      {children}
    </p>
  )
}
