import { existsSync } from 'node:fs'
import path from 'node:path'
import express from 'express'
import { app } from './app.js'
import { PORT } from './config.js'
import { errorHandler } from './errors.js'

// After `npm run build` in client/, this one process serves the built React
// app as well as the API. In development Vite serves the pages and proxies
// /api here, so client/dist/ doesn't exist and this block is skipped.
const dist = path.resolve(import.meta.dirname, '../client/dist')
if (existsSync(path.join(dist, 'index.html'))) {
  app.use(express.static(dist))
  // Client-side routes (/dashboard, /login) all resolve to the one page.
  app.get('/{*path}', (req, res) => res.sendFile(path.join(dist, 'index.html')))
  // Express hands an error only to handlers registered after the route that
  // raised it, so the one in app.js never sees a failure from the two lines
  // above. Without this, a page URL with a broken escape got Express's default
  // error page, stack trace and file paths included.
  app.use(errorHandler)
}

app.listen(PORT, () => {
  console.log(`WorkBud API listening on http://localhost:${PORT}`)
})
