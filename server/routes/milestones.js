import { Router } from 'express'
import { removeById } from '../db.js'
import { unwrap } from '../errors.js'
import {
  checkId,
  date,
  number,
  parse,
  parseQuery,
  required,
  text,
  timestamp,
  uuid,
} from '../validate.js'
import { assertOwnJob } from './jobs.js'

const COLS = 'id, job_id, title, due_date, target_hours, done_at, created_at'

const schema = {
  title: required(text({ min: 1, max: 80 })),
  due_date: date({ nullable: true }),
  // Null means a plain dated checkpoint with no hours goal attached.
  target_hours: number({ min: 0.01, max: 999999.99, nullable: true }),
  // Null until ticked. PATCH { done_at } is how the checkbox is toggled.
  done_at: timestamp({ nullable: true }),
}

export const milestones = Router()
milestones.param('id', checkId)

// GET /api/milestones?job_id=
milestones.get('/', async (req, res) => {
  const { job_id } = parseQuery({ job_id: uuid() }, req.query)

  let query = req.db.from('milestones').select(COLS)
  if (job_id) query = query.eq('job_id', job_id)

  res.json(unwrap(await query.order('created_at', { ascending: true })))
})

milestones.get('/:id', async (req, res) => {
  res.json(
    unwrap(await req.db.from('milestones').select(COLS).eq('id', req.params.id).single()),
  )
})

milestones.post('/', async (req, res) => {
  const values = parse({ job_id: required(uuid()), ...schema }, req.body)
  await assertOwnJob(req.db, values.job_id)

  const row = unwrap(
    await req.db
      .from('milestones')
      .insert({ ...values, user_id: req.user.id })
      .select(COLS)
      .single(),
  )
  res.status(201).location(`/api/milestones/${row.id}`).json(row)
})

milestones.patch('/:id', async (req, res) => {
  const values = parse(schema, req.body, { partial: true })
  const row = unwrap(
    await req.db
      .from('milestones')
      .update(values)
      .eq('id', req.params.id)
      .select(COLS)
      .single(),
  )
  res.json(row)
})

milestones.delete('/:id', removeById('milestones'))
