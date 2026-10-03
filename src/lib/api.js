import { supabase } from './supabase'

/**
 * The WorkBud API (see server/). Supabase Auth still signs the user in; this
 * sends the access token it issued with every request, and the server uses it
 * to work out whose rows to touch.
 *
 * Every call resolves to { data, error } and never throws, the same shape
 * supabase-js uses, so callers handle both kinds of failure one way.
 */
async function request(method, path, body) {
  // getSession() refreshes an expired token before handing it back.
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  let res
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    return {
      data: null,
      error: { message: "Can't reach the server. Check your connection and try again." },
    }
  }

  if (res.status === 204) return { data: null, error: null }

  // A crashed or missing server answers with an HTML page, not JSON.
  const payload = await res.json().catch(() => null)
  if (!res.ok) {
    return {
      data: null,
      error: {
        status: res.status,
        message: payload?.error ?? `The server returned an error (${res.status}).`,
      },
    }
  }
  return { data: payload, error: null }
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
}
