import { Router } from 'express'
import { removeById } from '../db.js'
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

/** A day marked as not worked carries no shift. */
function clearShiftIfAbsent(values) {
  if (!values.absent) return values
  return { ...values, hours_worked: 0, time_in: null, time_out: null, break_minutes: 0 }
}

/**
 * Save a log and, when `items` is a list, replace the day's expenses with it.
 * save_log() in schema.sql does all of it in one transaction, so a failure
 * part-way leaves the day exactly as it was.
 *
 * amount_spent is never taken from the client: the function sets it to the sum
 * of the expense rows it stored, so the total can't disagree with the items.
 *
 * Resolves to the log's id, or to null when `id` is not a log of the caller's.
 */
const saveLog = async (req, { id = null, jobId = null, values, items = null }) =>
  unwrap(
    await req.db.rpc('save_log', {
      p_log_id: id,
      p_job_id: jobId,
      p_fields: values,
      p_expenses: items,
    }),
  )

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

  const id = await saveLog(req, { jobId: job_id, values, items })

  res.status(201).location(`/api/logs/${id}`).json(await fetchLog(req, id))
})

logs.patch('/:id', async (req, res) => {
  const { id } = req.params
  // The list is small and edited as a whole, so it is replaced, not diffed.
  const items = parseExpenses(req.body)
  // A body holding only `expenses` is a valid update on its own.
  const values = clearShiftIfAbsent(
    parse(schema, req.body, { partial: true, allowEmpty: Boolean(items) }),
  )

  // A missing or foreign id is a 404, and nothing has moved, line items included.
  if (!(await saveLog(req, { id, values, items }))) throw new HttpError(404, 'Not found.')

  res.json(await fetchLog(req, id))
})

// Its expenses go with it: the foreign key cascades.
logs.delete('/:id', removeById('daily_logs'))
