import express from 'express'
import { requireAuth } from './auth.js'
import { anon } from './db.js'
import { errorHandler, notFound } from './errors.js'
import { account } from './routes/account.js'
import { jobs } from './routes/jobs.js'
import { logs } from './routes/logs.js'
import { milestones } from './routes/milestones.js'
import { profile } from './routes/profile.js'

/**
 * The WorkBud API. Built here without listening, so the same app serves both
 * `node server/index.js` locally and the Vercel function in api/index.js.
 */
export const app = express()

app.disable('x-powered-by')
// A day's log with its expenses is a few kilobytes; nothing legitimate is big.
app.use(express.json({ limit: '100kb' }))

const api = express.Router()

// Public, so a monitor (or a grader) can tell at a glance whether the server
// is up and can reach its database. email_registered() is the one query the
// signed-out role is allowed to run, which makes it the honest round trip.
api.get('/health', async (req, res) => {
  const { error } = await anon.rpc('email_registered', { p_email: '' })
  if (error) {
    console.error('Health check failed:', error)
    return res.status(503).json({ status: 'error', database: 'unreachable' })
  }
  res.json({ status: 'ok', database: 'connected' })
})

// Everything below this line needs a signed-in user.
api.use(requireAuth)
api.use('/profile', profile)
api.use('/jobs', jobs)
api.use('/logs', logs)
api.use('/milestones', milestones)
api.use('/account', account)

app.use('/api', api)
app.use('/api', notFound)
app.use(errorHandler)
