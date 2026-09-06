/**
 * Password quality, shared by every screen that sets one.
 *
 * The server's floor is 6 characters and nothing else, which is what the old
 * signup enforced — "aaaaaa" sailed through. Signup asks for more, because a
 * password chosen here is the only thing standing between someone's phone and
 * their whole log. Everything is checked live so the rules are visible while
 * typing rather than thrown back after a failed submit.
 */
export const MIN_PASSWORD = 8

// The handful that actually show up in credential-stuffing lists, trimmed to
// what a real person might type here. Compared after lowercasing.
const COMMON = new Set([
  'password',
  'password1',
  'password123',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty123',
  'qwertyuiop',
  'iloveyou',
  'abc12345',
  'letmein123',
  'welcome123',
  'admin123',
  'workbud123',
])

/**
 * @returns {{
 *   rules: {id: string, label: string, ok: boolean}[],
 *   met: boolean,      // every required rule passes and there's no problem
 *   problem: string|null, // a reason to refuse even when the rules pass
 *   score: 0|1|2|3|4,
 *   label: string,
 * }}
 */
export function evaluatePassword(password = '', email = '') {
  const rules = [
    {
      id: 'length',
      label: `${MIN_PASSWORD}+ characters`,
      ok: password.length >= MIN_PASSWORD,
    },
    { id: 'letter', label: 'A letter', ok: /[a-z]/i.test(password) },
    { id: 'number', label: 'A number', ok: /\d/.test(password) },
  ]

  const passes = rules.every((r) => r.ok)
  const local = email.trim().toLowerCase().split('@')[0]

  let problem = null
  if (password && COMMON.has(password.toLowerCase()))
    problem = 'That password is one of the most guessed ones. Pick another.'
  else if (local && local.length >= 3 && password.toLowerCase().includes(local))
    problem = "Don't build the password out of your email address."
  else if (password && /^(.)\1+$/.test(password))
    problem = 'That is the same character repeated. Pick another.'

  // Strength is advisory — it moves past "Fair" only once the rules are met,
  // so the bar never looks encouraging while the form would still reject it.
  let score = 0
  if (passes && !problem) {
    score = 2
    if (password.length >= 12) score += 1
    if (/[^a-z0-9]/i.test(password) && /[A-Z]/.test(password)) score += 1
  } else if (password.length) {
    score = rules.filter((r) => r.ok).length >= 2 ? 1 : 0
  }

  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong']

  return {
    rules,
    met: passes && !problem,
    problem,
    score,
    label: password ? labels[score] : '',
  }
}
