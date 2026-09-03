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

/** "September 2025" — the budget card's period label. */
export function formatMonth(date = new Date()) {
  return monthName.format(date)
}
