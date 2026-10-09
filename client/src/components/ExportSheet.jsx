import { useState } from 'react'
import { FileSpreadsheet, Printer } from 'lucide-react'
import {
  buildCsv,
  buildDtrHtml,
  buildTimeLogCsv,
  buildTimeLogHtml,
} from '../lib/export'
import { todayISO } from '../lib/format'
import { Sheet } from './Sheet'
import { Alert, Button, Field, TextInput } from './ui'

/**
 * What goes in the file. The time log is what a school or supervisor signs —
 * hours and what was done — so it leads; the full record keeps the money for
 * the trainee's own books.
 */
const MODES = [
  { id: 'timelog', label: 'Time log', hint: 'Time in/out, hours and notes' },
  { id: 'full', label: 'Full record', hint: 'Adds break and expenses' },
]

/** Export the active job's entries as a printable record or a CSV file. */
export function ExportSheet({ open, job, profile, email, logs, expensesFor, onClose }) {
  const earliest = logs.length
    ? logs.reduce((min, l) => (l.entry_date < min ? l.entry_date : min), logs[0].entry_date)
    : todayISO()

  const [mode, setMode] = useState('timelog')
  const [from, setFrom] = useState(earliest)
  const [to, setTo] = useState(todayISO())
  const [error, setError] = useState(null)

  const inRange = logs.filter((l) => l.entry_date >= from && l.entry_date <= to)
  const timeLog = mode === 'timelog'

  function openRecord() {
    if (!inRange.length) return setError('No entries in that range.')
    setError(null)

    const html = timeLog
      ? buildTimeLogHtml({ job, profile, logs: inRange, email })
      : buildDtrHtml({ job, profile, logs: inRange, expensesFor, email })
    const win = window.open('', '_blank')
    if (!win) {
      // Safari blocks window.open outside a direct gesture chain, and an
      // installed PWA has no tab to fall back to.
      setError('Your browser blocked the new window. Allow pop-ups and retry.')
      return
    }
    win.document.write(html)
    win.document.close()
  }

  function downloadCsv() {
    if (!inRange.length) return setError('No entries in that range.')
    setError(null)

    const csv = timeLog ? buildTimeLogCsv(inRange) : buildCsv(inRange, expensesFor)
    // BOM so Excel opens UTF-8 (₱ and friends) correctly.
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const slug = (job?.name ?? 'job').replace(/\W+/g, '-').toLowerCase()
    a.download = `workbud-${slug}-${timeLog ? 'timelog-' : ''}${to}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <Sheet open={open} onClose={onClose} title="Export">
      <div className="flex flex-col gap-4">
        <p className="text-[13px] leading-snug text-muted">
          A signed time record for <span className="font-medium text-ink">{job?.name}</span>,
          or the raw rows as a spreadsheet.
        </p>

        <div
          role="radiogroup"
          aria-label="What to include"
          className="grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1"
        >
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={mode === m.id}
              onClick={() => setMode(m.id)}
              className={`rounded-xl px-3 py-2 text-left transition ${
                mode === m.id ? 'bg-surface shadow-card' : 'active:bg-surface/60'
              }`}
            >
              <span
                className={`block text-[13.5px] font-semibold ${
                  mode === m.id ? 'text-brand' : 'text-ink'
                }`}
              >
                {m.label}
              </span>
              <span className="block text-[11.5px] leading-snug text-muted">
                {m.hint}
              </span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="From">
            <TextInput
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
            />
          </Field>
          <Field label="To">
            <TextInput
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
            />
          </Field>
        </div>

        <p className="text-[12.5px] text-faint">
          {inRange.length} {inRange.length === 1 ? 'entry' : 'entries'} in range
        </p>

        <Alert>{error}</Alert>

        <Button onClick={openRecord}>
          <Printer size={17} />
          {timeLog ? 'Printable time log' : 'Printable full record'}
        </Button>
        <Button variant="secondary" onClick={downloadCsv}>
          <FileSpreadsheet size={17} />
          Download CSV
        </Button>
      </div>
    </Sheet>
  )
}
