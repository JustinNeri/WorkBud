/**
 * One metric: a headline value against its target, a bar, and what's left.
 * `tone` picks the accent — brand for hours, money/over for spending.
 */
export function ProgressCard({
  icon: Icon,
  label,
  period,
  value,
  target,
  percent,
  footnote,
  tone = 'brand',
  style,
}) {
  const tones = {
    brand: { bar: 'bg-brand', chip: 'bg-brand-soft text-brand' },
    money: { bar: 'bg-money', chip: 'bg-money-soft text-money' },
    over: { bar: 'bg-over', chip: 'bg-over-soft text-over' },
  }
  const t = tones[tone]

  return (
    <section
      className="animate-rise rounded-2xl bg-surface p-4 shadow-card"
      style={style}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className={`flex size-9 items-center justify-center rounded-xl ${t.chip}`}>
            <Icon size={18} />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold leading-tight">{label}</h2>
            {period ? (
              <p className="text-xs leading-tight text-faint">{period}</p>
            ) : null}
          </div>
        </div>
        <span className="text-[13px] font-semibold tabular-nums text-muted">
          {Math.round(percent)}%
        </span>
      </div>

      <div className="mt-3.5 flex items-baseline gap-1.5">
        <span className="text-[26px] font-bold leading-none tracking-tight tabular-nums">
          {value}
        </span>
        <span className="text-[14px] text-muted">of {target}</span>
      </div>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${t.bar}`}
          style={{ width: `${Math.max(percent, percent > 0 ? 3 : 0)}%` }}
        />
      </div>

      <p className="mt-2.5 text-[13px] text-muted">{footnote}</p>
    </section>
  )
}
