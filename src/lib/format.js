const LOCALE = 'en-US'

/** Offered at onboarding and changeable in settings. */
export const CURRENCIES = [
  { code: 'PHP', label: 'Philippine peso', symbol: '₱' },
  { code: 'USD', label: 'US dollar', symbol: '$' },
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'GBP', label: 'British pound', symbol: '£' },
  { code: 'JPY', label: 'Japanese yen', symbol: '¥' },
  { code: 'AUD', label: 'Australian dollar', symbol: 'A$' },
  { code: 'CAD', label: 'Canadian dollar', symbol: 'C$' },
  { code: 'SGD', label: 'Singapore dollar', symbol: 'S$' },
  { code: 'AED', label: 'UAE dirham', symbol: 'د.إ' },
  { code: 'INR', label: 'Indian rupee', symbol: '₹' },
]

// One active currency for the account. Set once when the profile loads, so
// call sites stay `formatMoney(n)` instead of threading a code through every
// component. Falls back to PHP until the profile arrives.
let active = 'PHP'
let money = null
let moneyWhole = null

function build() {
  const opts = { style: 'currency', currency: active }
  money = new Intl.NumberFormat(LOCALE, { ...opts, maximumFractionDigits: 2 })
  moneyWhole = new Intl.NumberFormat(LOCALE, { ...opts, maximumFractionDigits: 0 })
}
build()

export function setCurrency(code) {
  if (!code || code === active) return
  active = code
  build()
}

export function currencySymbol(code = active) {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? '$'
}

export function formatMoney(value, { compact = false } = {}) {
  const n = Number(value) || 0
  return compact && Number.isInteger(n) ? moneyWhole.format(n) : money.format(n)
}

/** 8 → "8h", 8.5 → "8.5h" */
export function formatHours(value) {
  const n = Number(value) || 0
  return `${Number.isInteger(n) ? n : n.toFixed(2).replace(/0$/, '')}h`
}

/** Fixed vocabulary so spending can be grouped; the label carries the detail. */
export const EXPENSE_CATEGORIES = [
  { value: 'transport', label: 'Transport' },
  { value: 'food', label: 'Food' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'fees', label: 'Fees' },
  { value: 'other', label: 'Other' },
]

export const categoryLabel = (value) =>
  EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? 'Other'

// --- shift times -----------------------------------------------------------

/**
 * Hours between two "HH:MM" times, minus an unpaid break.
 * A time-out earlier than time-in is treated as crossing midnight, so a
 * 22:00 → 06:00 shift reads as 8h rather than -16.
 * Returns null when either end is missing.
 */
export function computeHours(timeIn, timeOut, breakMinutes = 0) {
  if (!timeIn || !timeOut) return null

  const toMinutes = (t) => {
    const [h, m] = String(t).split(':').map(Number)
    return h * 60 + m
  }

  let minutes = toMinutes(timeOut) - toMinutes(timeIn)
  if (minutes < 0) minutes += 24 * 60
  minutes -= Number(breakMinutes) || 0

  return Math.max(0, Math.round((minutes / 60) * 100) / 100)
}

/** Current local wall-clock time as "HH:MM", ready for a `time` column. */
export function nowTime(date = new Date()) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`
}

/** The real Date a shift began, from its log's date plus its time_in. */
export function shiftStartedAt(entryDateISO, timeIn) {
  const date = fromISODate(entryDateISO)
  const [h, m] = String(timeIn).split(':').map(Number)
  date.setHours(h, m, 0, 0)
  return date
}

/** Elapsed seconds → "7h 24m" / "48m" / "12s" for a running clock. */
export function formatElapsed(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  if (m > 0) return `${m}m ${String(s % 60).padStart(2, '0')}s`
  return `${s}s`
}

/** "9:00 AM" from "09:00" / "09:00:00" — for the activity feed. */
export function formatTime(value) {
  if (!value) return null
  const [h, m] = String(value).split(':').map(Number)
  const date = new Date()
  date.setHours(h, m, 0, 0)
  return date.toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit' })
}

// --- dates -----------------------------------------------------------------
// entry_date is a plain `date` column, so everything here stays in LOCAL time.
// Using toISOString() directly would shift the day for anyone behind UTC.

/** Local calendar date as YYYY-MM-DD. */
export function toISODate(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const todayISO = () => toISODate()

/** First day of `date`'s calendar month, as YYYY-MM-DD. */
export function monthStartISO(date = new Date()) {
  return toISODate(new Date(date.getFullYear(), date.getMonth(), 1))
}

/** YYYY-MM-DD → local Date (never through Date.parse, which assumes UTC). */
export function fromISODate(iso) {
  const [y, m, d] = String(iso).split('-').map(Number)
  return new Date(y, m - 1, d)
}

const dayMonth = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})
const withYear = new Intl.DateTimeFormat(LOCALE, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})
const monthName = new Intl.DateTimeFormat(LOCALE, {
  month: 'long',
  year: 'numeric',
})

/** "Today" / "Yesterday" / "Mon, Sep 1" / "Sep 1, 2025" for older years. */
export function formatEntryDate(iso) {
  const date = fromISODate(iso)
  if (iso === todayISO()) return 'Today'

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (iso === toISODate(yesterday)) return 'Yesterday'

  return date.getFullYear() === new Date().getFullYear()
    ? dayMonth.format(date)
    : withYear.format(date)
}

/**
 * Working days (Mon–Fri) from today through `endISO`, inclusive.
 * Returns 0 once the date has passed. Weekends are excluded because a
 * required-pace figure that assumes 7-day weeks is not one anyone can act on.
 */
export function weekdaysUntil(endISO, fromISO = todayISO()) {
  if (!endISO) return null
  const end = fromISODate(endISO)
  const cursor = fromISODate(fromISO)
  if (end < cursor) return 0

  let count = 0
  while (cursor <= end) {
    const day = cursor.getDay()
    if (day !== 0 && day !== 6) count += 1
    cursor.setDate(cursor.getDate() + 1)
  }
  return count
}

/** Whole days until `endISO`; negative once it's passed. */
export function daysUntil(endISO, fromISO = todayISO()) {
  if (!endISO) return null
  return Math.round(
    (fromISODate(endISO) - fromISODate(fromISO)) / (1000 * 60 * 60 * 24),
  )
}

/** "September 2025" — the budget card's period label. */
export function formatMonth(date = new Date()) {
  return monthName.format(date)
}
