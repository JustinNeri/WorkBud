import { Router } from 'express'
import { HttpError, unwrap } from '../errors.js'
import {
  boolean,
  checkId,
  date,
  invalid,
  number,
  oneOf,
  parse,
  parseQuery,
  required,
  text,
  time,
  uuid,
} from '../validate.js'
import { assertOwnJob } from './jobs.js'

const EXPENSE_COLS = 'id, log_id, label, amount, category, created_at'

// A log is always returned with its expense line items nested inside it.
const COLS = `id, job_id, entry_date, hours_worked, amount_spent, description, time_in, time_out, break_minutes, absent, created_at, expenses(${EXPENSE_COLS})`

const MAX_EXPENSES = 50

const schema = {
  entry_date: required(date()),
  absent: boolean(),
  hours_worked: number({ min: 0, max: 24 }),
  time_in: time({ nullable: true }),
  time_out: time({ nullable: true }),
  break_minutes: number({ min: 0, max: 1439, integer: true }),
  description: text({ max: 2000, nullable: true }),
}

const expenseSchema = {
  label: text({ max: 120, nullable: true }),
  amount: required(number({ min: 0, max: 9999999999.99 })),
  category: oneOf(['transport', 'food', 'supplies', 'fees', 'other']),
}

const filters = {
  job_id: uuid(),
  from: date(),
  to: date(),
}

/**
 * Pull the optional `expenses` array out of a body. Returns undefined when the
 * key is absent, which a PATCH reads as "leave the line items alone".
 */
function parseExpenses(body) {
  const list = body?.expenses
  if (list === undefined) return undefined
  if (!Array.isArray(list)) invalid({ expenses: 'must be a list' })
  if (list.length > MAX_EXPENSES)
    invalid({ expenses: `must have at most ${MAX_EXPENSES} items` })
  return list.map((item) => parse(expenseSchema, item))
}

/**
 * amount_spent is never taken from the client: it is always the sum of the
 * line items, so the two can't disagree. Rounded to cents to keep float drift
 * (0.1 + 0.2) out of a numeric(12, 2) column.
 */
const total = (items) =>
  Math.round(items.reduce((sum, item) => sum + item.amount, 0) * 100) / 100

/** A day marked as not worked carries no shift. */
function clearShiftIfAbsent(values) {
  if (!values.absent) return values
  return { ...values, hours_worked: 0, time_in: null, time_out: null, break_minutes: 0 }
}

async function insertExpenses(req, logId, items) {
  if (items.length === 0) return
  unwrap(
    await req.db
      .from('expenses')
      .insert(items.map((item) => ({ ...item, log_id: logId, user_id: req.user.id }))),
  )
}

const fetchLog = async (req, id) =>
  unwrap(
    await req.db
      .from('daily_logs')
      .select(COLS)
      .eq('id', id)
      .order('created_at', { referencedTable: 'expenses', ascending: true })
      .single(),
  )

export const logs = Router()
logs.param('id', checkId)

// GET /api/logs?job_id=&from=&to=   newest first
logs.get('/', async (req, res) => {
  const { job_id, from, to } = parseQuery(filters, req.query)

  let query = req.db.from('daily_logs').select(COLS)
  if (job_id) query = query.eq('job_id', job_id)
  if (from) query = query.gte('entry_date', from)
  if (to) query = query.lte('entry_date', to)

  const rows = unwrap(
    await query
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .order('created_at', { referencedTable: 'expenses', ascending: true }),
  )
  res.json(rows)
})

logs.get('/:id', async (req, res) => {
  res.json(await fetchLog(req, req.params.id))
})

logs.post('/', async (req, res) => {
  const { job_id, ...fields } = parse({ job_id: required(uuid()), ...schema }, req.body)
  const values = clearShiftIfAbsent(fields)
  const items = parseExpenses(req.body) ?? []
  await assertOwnJob(req.db, job_id)

  const created = unwrap(
    await req.db
      .from('daily_logs')
      .insert({ ...values, amount_spent: total(items), job_id, user_id: req.user.id })
      .select('id')
      .single(),
  )

  try {
    await insertExpenses(req, created.id, items)
  } catch (err) {
    // Two writes, no transaction across them: take the log back out so a
    // failed save doesn't leave a day whose total has no items behind it.
    await req.db.from('daily_logs').delete().eq('id', created.id)
    throw err
  }

  res
    .status(201)
    .location(`/api/logs/${created.id}`)
    .json(await fetchLog(req, created.id))
})

logs.patch('/:id', async (req, res) => {
  const { id } = req.params
  const items = parseExpenses(req.body)
  // A body holding only `expenses` is a valid update on its own.
  const values = clearShiftIfAbsent(
    parse(schema, req.body, { partial: true, allowEmpty: Boolean(items) }),
  )
  if (items) values.amount_spent = total(items)

  // .single() makes a missing or foreign id a 404 before any line item moves.
  unwrap(await req.db.from('daily_logs').update(values).eq('id', id).select('id').single())

  if (items) {
    // The list is small and edited as a whole, so it is replaced, not diffed.
    unwrap(await req.db.from('expenses').delete().eq('log_id', id))
    await insertExpenses(req, id, items)
  }

  res.json(await fetchLog(req, id))
})

// Its expenses go with it: the foreign key cascades.
logs.delete('/:id', async (req, res) => {
  const gone = unwrap(
    await req.db.from('daily_logs').delete().eq('id', req.params.id).select('id'),
  )
  if (gone.length === 0) throw new HttpError(404, 'Not found.')
  res.status(204).end()
})
