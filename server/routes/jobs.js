import { Router } from 'express'
import { removeById } from '../db.js'
import { unwrap } from '../errors.js'
import { checkId, date, invalid, number, parse, required, text } from '../validate.js'

const COLS =
  'id, name, target_hours, monthly_budget, daily_budget, deadline, hourly_rate, daily_hours, start_date, sort_order, created_at'

const schema = {
  name: required(text({ min: 1, max: 60 })),
  target_hours: number({ min: 0, max: 999999.99 }),
  monthly_budget: number({ min: 0, max: 9999999999.99 }),
  daily_budget: number({ min: 0, max: 9999999999.99 }),
  hourly_rate: number({ min: 0, max: 99999999.99 }),
  daily_hours: number({ min: 0, max: 24 }),
  start_date: date({ nullable: true }),
  deadline: date({ nullable: true }),
  sort_order: number({ min: 0, max: 10000, integer: true }),
}

/** The one rule that spans two fields. ISO dates compare correctly as text. */
function checkDates({ start_date, deadline }) {
  if (start_date && deadline && start_date > deadline)
    invalid({ start_date: 'must not be after the deadline' })
}

/**
 * Logs and milestones name the job they belong to. RLS only proves the new
 * row's user_id is the caller's, not that the job is, so this is checked here.
 * The lookup is itself RLS-scoped: someone else's job simply isn't found.
 */
export async function assertOwnJob(db, jobId) {
  const job = unwrap(await db.from('jobs').select('id').eq('id', jobId).maybeSingle())
  if (!job) invalid({ job_id: 'does not match one of your jobs' })
}

export const jobs = Router()
jobs.param('id', checkId)

jobs.get('/', async (req, res) => {
  const rows = unwrap(
    await req.db
      .from('jobs')
      .select(COLS)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
  )
  res.json(rows)
})

jobs.get('/:id', async (req, res) => {
  res.json(unwrap(await req.db.from('jobs').select(COLS).eq('id', req.params.id).single()))
})

jobs.post('/', async (req, res) => {
  const values = parse(schema, req.body)
  checkDates(values)
  const row = unwrap(
    await req.db
      .from('jobs')
      .insert({ ...values, user_id: req.user.id })
      .select(COLS)
      .single(),
  )
  res.status(201).location(`/api/jobs/${row.id}`).json(row)
})

jobs.patch('/:id', async (req, res) => {
  const values = parse(schema, req.body, { partial: true })
  // A PATCH can carry just one of the two dates; compare it with the saved one.
  if (('start_date' in values) !== ('deadline' in values)) {
    const saved = unwrap(
      await req.db.from('jobs').select('start_date, deadline').eq('id', req.params.id).single(),
    )
    checkDates({ ...saved, ...values })
  } else {
    checkDates(values)
  }
  const row = unwrap(
    await req.db.from('jobs').update(values).eq('id', req.params.id).select(COLS).single(),
  )
  res.json(row)
})

// Logs, expenses and milestones go with it: the foreign keys cascade.
jobs.delete('/:id', removeById('jobs'))
