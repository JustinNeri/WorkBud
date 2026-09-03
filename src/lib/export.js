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

  const rows = [...logs]
    .sort((a, b) => (a.entry_date < b.entry_date ? -1 : 1))
    .map((l) =>
      [
        l.entry_date,
        l.time_in?.slice(0, 5) ?? '',
        l.time_out?.slice(0, 5) ?? '',
        l.break_minutes ?? 0,
        Number(l.hours_worked),
        Number(l.amount_spent),
        expensesFor(l.id)
          .map((e) => `${e.label || categoryLabel(e.category)}: ${Number(e.amount)}`)
          .join('; '),
        l.description ?? '',
      ].map(csvCell).join(','),
    )

  return [header.map(csvCell).join(','), ...rows].join('\r\n')
}

/**
 * A printable Daily Time Record — the thing an OJT coordinator actually signs.
 * Opened in a new window so the user can print or save as PDF; the browser's
 * own print dialog avoids shipping a PDF library for one screen.
 */
export function buildDtrHtml({ job, profile, logs, expensesFor, email }) {
  const ordered = [...logs].sort((a, b) =>
    a.entry_date < b.entry_date ? -1 : 1,
  )

  const totalHours = ordered.reduce((s, l) => s + Number(l.hours_worked), 0)
  const totalSpent = ordered.reduce((s, l) => s + Number(l.amount_spent), 0)

  const fullName = [profile?.first_name, profile?.middle_initial, profile?.last_name]
    .filter(Boolean)
    .join(' ')

  const range = ordered.length
    ? `${formatEntryDate(ordered[0].entry_date)} – ${formatEntryDate(
        ordered[ordered.length - 1].entry_date,
      )}`
    : '—'

  const rows = ordered
    .map((l) => {
      const items = expensesFor(l.id)
        .map((e) => `${esc(e.label || categoryLabel(e.category))} ${formatMoney(e.amount)}`)
        .join(', ')
      return `<tr>
        <td>${fromISODate(l.entry_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}</td>
        <td>${esc(formatTime(l.time_in) ?? '—')}</td>
        <td>${esc(formatTime(l.time_out) ?? '—')}</td>
        <td class="num">${l.break_minutes || 0}</td>
        <td class="num">${Number(l.hours_worked)}</td>
        <td class="num">${esc(formatMoney(l.amount_spent))}</td>
        <td class="small">${items || esc(l.description ?? '')}</td>
      </tr>`
    })
    .join('')

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>DTR — ${esc(job?.name ?? 'WorkBud')}</title>
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
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .small { font-size: 11px; color: #444; }
  tfoot td { font-weight: 700; background: #fafafe; }
  .sign { margin-top: 42px; display: flex; gap: 48px; }
  .sign div { flex: 1; border-top: 1px solid #333; padding-top: 6px; font-size: 11px; color: #444; }
  @media print { body { margin: 12mm; } .noprint { display: none; } }
</style></head>
<body>
  <h1>Daily Time Record</h1>
  <p class="sub">${esc(job?.name ?? '')} · ${esc(range)}</p>

  <div class="meta">
    <div><span>Name</span>${esc(fullName || email || '—')}</div>
    <div><span>Occupation</span>${esc(profile?.occupation ?? '—')}</div>
    <div><span>Target hours</span>${Number(job?.target_hours ?? 0)}</div>
    <div><span>Hours completed</span>${totalHours}</div>
  </div>

  <table>
    <thead><tr>
      <th>Date</th><th>Time in</th><th>Time out</th><th class="num">Break</th>
      <th class="num">Hours</th><th class="num">Spent</th><th>Expenses / note</th>
    </tr></thead>
    <tbody>${rows || '<tr><td colspan="7">No entries.</td></tr>'}</tbody>
    <tfoot><tr>
      <td colspan="4">Total — ${ordered.length} day${ordered.length === 1 ? '' : 's'}</td>
      <td class="num">${totalHours}</td>
      <td class="num">${esc(formatMoney(totalSpent))}</td>
      <td></td>
    </tr></tfoot>
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
