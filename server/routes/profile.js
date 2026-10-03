import { Router } from 'express'
import { unwrap } from '../errors.js'
import { invalid, number, parse, text, timestamp } from '../validate.js'

const COLS =
  'id, first_name, last_name, middle_initial, age, occupation, currency, avatar_path, onboarded_at'

const schema = {
  first_name: text({ min: 1, max: 60 }),
  last_name: text({ min: 1, max: 60 }),
  middle_initial: text({ max: 4, nullable: true }),
  age: number({ min: 10, max: 120, integer: true, nullable: true }),
  occupation: text({ max: 80 }),
  currency: text({ min: 3, max: 3 }),
  avatar_path: text({ max: 200, nullable: true }),
  onboarded_at: timestamp(),
}

// The profile is a singleton: each user has exactly one, created by a database
// trigger at signup. So there is no id in the path, and no POST or DELETE here;
// deleting the account (DELETE /api/account) is what removes it.
export const profile = Router()

profile.get('/', async (req, res) => {
  res.json(
    unwrap(await req.db.from('profiles').select(COLS).eq('id', req.user.id).single()),
  )
})

profile.patch('/', async (req, res) => {
  const values = parse(schema, req.body, { partial: true })

  if (values.currency && !/^[A-Z]{3}$/.test(values.currency))
    invalid({ currency: 'must be a three-letter currency code' })
  // Uploads are confined to a folder named for the user's id by the storage
  // policies; hold the stored path to the same rule so a profile can't be
  // pointed at someone else's picture.
  if (values.avatar_path && !values.avatar_path.startsWith(`${req.user.id}/`))
    invalid({ avatar_path: 'must be inside your own folder' })

  const row = unwrap(
    await req.db
      .from('profiles')
      .update(values)
      .eq('id', req.user.id)
      .select(COLS)
      .single(),
  )
  res.json(row)
})
