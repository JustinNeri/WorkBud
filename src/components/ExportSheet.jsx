import { useState } from 'react'
import { FileSpreadsheet, Printer } from 'lucide-react'
import { buildCsv, buildDtrHtml } from '../lib/export'
import { todayISO } from '../lib/format'
import { Sheet } from './Sheet'
import { Alert, Button, Field, TextInput } from './ui'

/** Export the active job's entries as a printable DTR or a CSV file. */
export function ExportSheet({ open, job, profile, email, logs, expensesFor, onClose }) {
  const earliest = logs.length
    ? logs.reduce((min, l) => (l.entry_date < min ? l.entry_date : min), logs[0].entry_date)
    : todayISO()

  const [from, setFrom] = useState(earliest)
  const [to, setTo] = useState(todayISO())
  const [error, setError] = useState(null)

  const inRange = logs.filter((l) => l.entry_date >= from && l.entry_date <= to)

  function openDtr() {
    if (!inRange.length) return setError('No entries in that range.')
    setError(null)

    const html = buildDtrHtml({ job, profile, logs: inRange, expensesFor, email })
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

    const csv = buildCsv(inRange, expensesFor)
    // BOM so Excel opens UTF-8 (₱ and friends) correctly.
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `workbud-${(job?.name ?? 'job').replace(/\W+/g, '-').toLowerCase()}-${to}.csv`
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

        <Button onClick={openDtr}>
          <Printer size={17} />
          Printable time record
        </Button>
        <Button variant="secondary" onClick={downloadCsv}>
          <FileSpreadsheet size={17} />
          Download CSV
        </Button>
      </div>
    </Sheet>
  )
}
