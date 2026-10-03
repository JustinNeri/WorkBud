import { Router } from 'express'
import { unwrap } from '../errors.js'

export const account = Router()

/**
 * Close the caller's own account. delete_own_account() in schema.sql removes
 * only the row for auth.uid(), so there is no id to pass and none to tamper
 * with; the foreign keys then cascade through every table. The client removes
 * the avatar files first, since those live in Storage rather than in a table.
 */
account.delete('/', async (req, res) => {
  unwrap(await req.db.rpc('delete_own_account'))
  res.status(204).end()
})
