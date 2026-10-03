// Vercel entry point. vercel.json rewrites every /api/* request to this file,
// and an Express app is itself a (req, res) handler, so it is exported as is.
export { app as default } from '../server/app.js'
