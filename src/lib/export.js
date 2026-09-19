import {
  categoryLabel,
  formatEntryDate,
  formatMoney,
  formatTime,
  fromISODate,
} from './format'

const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  )

/** A cell is quoted and its quotes doubled — otherwise a note with a comma
 *  silently shifts every column after it. */
const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`

const byDate = (a, b) => (a.entry_date < b.entry_date ? -1 : 1)

const toCsv = (header, rows) =>
  [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')

const printDate = (iso) =>
  fromISODate(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

/**
 * The day's note, with an absence stated in front of it.
 *
 * A day off is reported in the note column rather than a column of its own.
 * The printed record has to stay narrow enough to read across, and the place
 * a coordinator already looks to find out what happened on a given day is the
 * account-of-the-work column — so that is where "Absent" belongs, ahead of
 * whatever reason was given.
 */
const noteFor = (l) =>
  l.absent
    ? `Absent${l.description ? ` — ${l.description}` : ''}`
    : (l.description ?? '')

/** Every column: shift, break, money, the day's expense items and its note. */
export function buildCsv(logs, expensesFor) {
  const header = [
    'Date',
    'Time in',
    'Time out',
    'Break (mins)',
    'Hours',
    'Spent',
    'Expenses',
    'Note',
  ]

  const rows = [...logs].sort(byDate).map((l) => [
    l.entry_date,
    l.time_in?.slice(0, 5) ?? '',
    l.time_out?.slice(0, 5) ?? '',
    l.break_minutes ?? 0,
    Number(l.hours_worked),
    Number(l.amount_spent),
    expensesFor(l.id)
      .map((e) => `${e.label || categoryLabel(e.category)}: ${Number(e.amount)}`)
      .join('; '),
    noteFor(l),
  ])

  return toCsv(header, rows)
}

/**
 * Hours and the day's note only — the record a coordinator reads to see what
 * was done at the office. No break, no money, no expense items: those are the
 * trainee's own business, not the school's.
 */
export function buildTimeLogCsv(logs) {
  const header = ['Date', 'Time in', 'Time out', 'Hours', 'Work done']

  const rows = [...logs].sort(byDate).map((l) => [
    l.entry_date,
    l.time_in?.slice(0, 5) ?? '',
    l.time_out?.slice(0, 5) ?? '',
    Number(l.hours_worked),
    noteFor(l),
  ])

  return toCsv(header, rows)
}

/** Name, date range and total hours shared by both printable records. */
function recordMeta({ profile, logs, email }) {
  const fullName = [profile?.first_name, profile?.middle_initial, profile?.last_name]
    .filter(Boolean)
    .join(' ')

  const range = logs.length
    ? `${formatEntryDate(logs[0].entry_date)} – ${formatEntryDate(
        logs[logs.length - 1].entry_date,
      )}`
    : '—'

  return {
    name: fullName || email || '—',
    range,
    totalHours: logs.reduce((s, l) => s + Number(l.hours_worked), 0),
    daysAbsent: logs.filter((l) => l.absent).length,
  }
}

/**
 * The printable page around a record's table: heading, trainee details,
 * signature lines. Opened in a new window so the user can print or save as
 * PDF; the browser's own print dialog avoids shipping a PDF library for one
 * screen.
 */
function recordPage({ title, job, profile, meta, head, body, foot, columns }) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(title)} — ${esc(job?.name ?? 'WorkBud')}</title>
<style>
  * { box-sizing: border-box; }
  body { font: 12px/1.45 -apple-system, "Segoe UI", Roboto, sans-serif; color: #111; margin: 32px; }
  h1 { font-size: 18px; margin: 0 0 2px; }
  .sub { color: #555; margin-bottom: 18px; }
  .meta { display: flex; gap: 28px; flex-wrap: wrap; margin-bottom: 18px; }
  .meta div { font-size: 12px; }
  .meta span { display: block; color: #666; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #d5d7e0; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f3f4f8; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; }
  tr { break-inside: avoid; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .nowrap { white-space: nowrap; }
  .small { font-size: 11px; color: #444; }
  .notes { white-space: pre-wrap; }
  /* A day off, greyed so the worked days are what stands out in a scan. */
  tr.off td { background: #fafafb; color: #6b7280; }
  .tag { font-weight: 700; letter-spacing: .03em; }
  tfoot td { font-weight: 700; background: #fafafe; }
  .sign { margin-top: 42px; display: flex; gap: 48px; }
  .sign div { flex: 1; border-top: 1px solid #333; padding-top: 6px; font-size: 11px; color: #444; }
  @media print { body { margin: 12mm; } .noprint { display: none; } }
</style></head>
<body>
  <h1>Daily Time Record</h1>
  <p class="sub">${esc(job?.name ?? '')} · ${esc(meta.range)}</p>

  <div class="meta">
    <div><span>Name</span>${esc(meta.name)}</div>
    <div><span>Occupation</span>${esc(profile?.occupation ?? '—')}</div>
    <div><span>Target hours</span>${Number(job?.target_hours ?? 0)}</div>
    <div><span>Hours completed</span>${meta.totalHours}</div>
  </div>

  <table>
    <thead><tr>${head}</tr></thead>
    <tbody>${body || `<tr><td colspan="${columns}">No entries.</td></tr>`}</tbody>
    <tfoot><tr>${foot}</tr></tfoot>
  </table>

  <div class="sign">
    <div>Trainee signature</div>
    <div>Supervisor signature</div>
  </div>

  <p class="noprint" style="margin-top:24px;color:#666">
    Use your browser's Print to save this as a PDF.
  </p>
</body></html>`
}

const daysLabel = (n) => `${n} day${n === 1 ? '' : 's'}`

/** "Total — 42 days (3 not worked)". The parenthetical only when it applies. */
const totalLabel = (meta, count) =>
  meta.daysAbsent > 0
    ? `Total — ${daysLabel(count)} (${meta.daysAbsent} not worked)`
    : `Total — ${daysLabel(count)}`

/** The full record — shift, break, money and what was bought. */
export function buildDtrHtml({ job, profile, logs, expensesFor, email }) {
  const ordered = [...logs].sort(byDate)
  const meta = recordMeta({ profile, logs: ordered, email })
  const totalSpent = ordered.reduce((s, l) => s + Number(l.amount_spent), 0)

  const body = ordered
    .map((l) => {
      const items = expensesFor(l.id)
        .map((e) => `${esc(e.label || categoryLabel(e.category))} ${formatMoney(e.amount)}`)
        .join(', ')
      return `<tr${l.absent ? ' class="off"' : ''}>
        <td class="nowrap">${printDate(l.entry_date)}</td>
        <td class="nowrap">${esc(formatTime(l.time_in) ?? '—')}</td>
        <td class="nowrap">${esc(formatTime(l.time_out) ?? '—')}</td>
        <td class="num">${l.break_minutes || 0}</td>
        <td class="num">${Number(l.hours_worked)}</td>
        <td class="num">${esc(formatMoney(l.amount_spent))}</td>
        <td class="small">${
          l.absent
            ? `<span class="tag">Absent</span>${
                l.description ? ` — ${esc(l.description)}` : ''
              }`
            : items || esc(l.description ?? '')
        }</td>
      </tr>`
    })
    .join('')

  return recordPage({
    title: 'DTR',
    job,
    profile,
    meta,
    columns: 7,
    head: `<th>Date</th><th>Time in</th><th>Time out</th><th class="num">Break</th>
      <th class="num">Hours</th><th class="num">Spent</th><th>Expenses / note</th>`,
    body,
    foot: `<td colspan="4">${totalLabel(meta, ordered.length)}</td>
      <td class="num">${meta.totalHours}</td>
      <td class="num">${esc(formatMoney(totalSpent))}</td>
      <td></td>`,
  })
}

/** Hours only, with the day's note as the account of the work done. */
export function buildTimeLogHtml({ job, profile, logs, email }) {
  const ordered = [...logs].sort(byDate)
  const meta = recordMeta({ profile, logs: ordered, email })

  const body = ordered
    .map(
      (l) => `<tr${l.absent ? ' class="off"' : ''}>
        <td class="nowrap">${printDate(l.entry_date)}</td>
        <td class="nowrap">${esc(formatTime(l.time_in) ?? '—')}</td>
        <td class="nowrap">${esc(formatTime(l.time_out) ?? '—')}</td>
        <td class="num">${Number(l.hours_worked)}</td>
        <td class="small notes">${
          l.absent
            ? `<span class="tag">Absent</span>${
                l.description ? ` — ${esc(l.description)}` : ''
              }`
            : esc(l.description ?? '')
        }</td>
      </tr>`,
    )
    .join('')

  return recordPage({
    title: 'Time log',
    job,
    profile,
    meta,
    columns: 5,
    head: `<th>Date</th><th>Time in</th><th>Time out</th><th class="num">Hours</th>
      <th style="width:50%">Work done</th>`,
    body,
    foot: `<td colspan="3">${totalLabel(meta, ordered.length)}</td>
      <td class="num">${meta.totalHours}</td>
      <td></td>`,
  })
}
