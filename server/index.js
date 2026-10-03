import { existsSync } from 'node:fs'
import path from 'node:path'
import express from 'express'
import { app } from './app.js'
import { PORT } from './config.js'

// After `npm run build`, this one process serves the built React app as well
// as the API. In development Vite serves the pages and proxies /api here, so
// dist/ doesn't exist and this block is skipped.
const dist = path.resolve('dist')
if (existsSync(path.join(dist, 'index.html'))) {
  app.use(express.static(dist))
  // Client-side routes (/dashboard, /login) all resolve to the one page.
  app.get('/{*path}', (req, res) => res.sendFile(path.join(dist, 'index.html')))
}

app.listen(PORT, () => {
  console.log(`WorkBud API listening on http://localhost:${PORT}`)
})
