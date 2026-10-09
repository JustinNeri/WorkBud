import express from 'express'
import { rateLimit } from 'express-rate-limit'
import helmet from 'helmet'
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
 * `node index.js` locally and the Vercel function in api/index.js.
 */
export const app = express()

app.disable('x-powered-by')
// On Vercel the function sits behind exactly one proxy, which is what puts the
// caller's address in X-Forwarded-For. Trusting it anywhere else would let a
// caller pick their own address and walk around the rate limit below.
if (process.env.VERCEL) app.set('trust proxy', 1)
// A day's log with its expenses is a few kilobytes; nothing legitimate is big.
app.use(express.json({ limit: '100kb' }))

const api = express.Router()

// Security headers on every API answer. Mounted on the router rather than the
// app, because index.js also serves the built pages from this app and helmet's
// default content policy would stop them reaching Supabase.
api.use(helmet())

// The dashboard makes four requests when it opens, so 300 in fifteen minutes
// is far more than a person needs and far less than a loop wants.
api.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) =>
      res.status(429).json({ error: 'Too many requests. Try again in a few minutes.' }),
  }),
)

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
