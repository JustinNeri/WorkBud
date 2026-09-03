import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, errorMessage } from '../lib/supabase'
import { monthStartISO, toISODate, todayISO } from '../lib/format'

/** Feed order: newest entry_date first, ties broken by newest created_at. */
function byNewest(a, b) {
  if (a.entry_date !== b.entry_date) return a.entry_date < b.entry_date ? 1 : -1
  return a.created_at < b.created_at ? 1 : -1
}

/**
 * Loads the profile + every log for the signed-in user and exposes CRUD.
 * RLS scopes all of this server-side, so no user_id filter is needed on reads.
 */
export function useWorkbud(userId) {
  const [profile, setProfile] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    const [profileRes, logsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, target_hours, monthly_budget')
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('daily_logs')
        .select('id, entry_date, hours_worked, amount_spent, description, created_at')
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false }),
    ])

    if (!profileRes.error) setProfile(profileRes.data)
    if (!logsRes.error) setLogs(logsRes.data ?? [])

    // Set once, at the end, so a successful reload also clears a stale error.
    const failure = profileRes.error || logsRes.error
    setError(failure ? errorMessage(failure) : null)
    setLoading(false)
  }, [userId])

  // App keys <Dashboard> by user id, so userId never changes under one mount:
  // `loading` starts true and load() settles it. Callers use reload() for a
  // silent refresh that leaves the rendered data in place.
  useEffect(() => {
    // load() fetches from Supabase — syncing with an external system is what
    // effects are for, and its setStates all happen after an await.
    // oxlint-disable-next-line react/set-state-in-effect
    load()
  }, [load])

  // --- mutations. Each returns { error } so the caller can keep its sheet open.
  const addLog = useCallback(
    async (values) => {
      const { data, error: err } = await supabase
        .from('daily_logs')
        .insert({ ...values, user_id: userId })
        .select('id, entry_date, hours_worked, amount_spent, description, created_at')
        .single()

      if (err) return { error: errorMessage(err) }
      setLogs((prev) => [data, ...prev].sort(byNewest))
      return {}
    },
    [userId],
  )

  const updateLog = useCallback(async (id, values) => {
    const { data, error: err } = await supabase
      .from('daily_logs')
      .update(values)
      .eq('id', id)
      .select('id, entry_date, hours_worked, amount_spent, description, created_at')
      .single()

    if (err) return { error: errorMessage(err) }
    setLogs((prev) => prev.map((l) => (l.id === id ? data : l)).sort(byNewest))
    return {}
  }, [])

  const deleteLog = useCallback(
    async (id) => {
      const previous = logs
      setLogs((prev) => prev.filter((l) => l.id !== id)) // optimistic
      const { error: err } = await supabase.from('daily_logs').delete().eq('id', id)
      if (err) {
        setLogs(previous) // put it back
        return { error: errorMessage(err) }
      }
      return {}
    },
    [logs],
  )

  const saveTargets = useCallback(
    async ({ target_hours, monthly_budget }) => {
      const { data, error: err } = await supabase
        .from('profiles')
        .update({ target_hours, monthly_budget })
        .eq('id', userId)
        .select('id, target_hours, monthly_budget')
        .single()

      if (err) return { error: errorMessage(err) }
      setProfile(data)
      return {}
    },
    [userId],
  )

  // --- derived totals
  const stats = useMemo(() => {
    const targetHours = Number(profile?.target_hours) || 0
    const monthlyBudget = Number(profile?.monthly_budget) || 0

    // Hours accumulate across the whole placement; spending resets each month.
    const loggedHours = logs.reduce((sum, l) => sum + Number(l.hours_worked), 0)
    const firstOfMonth = monthStartISO()
    const spentThisMonth = logs
      .filter((l) => l.entry_date >= firstOfMonth)
      .reduce((sum, l) => sum + Number(l.amount_spent), 0)

    const pct = (value, total) =>
      total > 0 ? Math.min((value / total) * 100, 100) : 0

    // Rolling 7 days, and an average over days actually worked (not calendar
    // days) — otherwise a weekend off drags the number down misleadingly.
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 6)
    const weekStart = toISODate(weekAgo)
    const weekHours = logs
      .filter((l) => l.entry_date >= weekStart)
      .reduce((sum, l) => sum + Number(l.hours_worked), 0)

    const daysWorked = new Set(
      logs.filter((l) => Number(l.hours_worked) > 0).map((l) => l.entry_date),
    ).size

    return {
      weekHours,
      daysWorked,
      avgPerDay: daysWorked > 0 ? loggedHours / daysWorked : 0,
      entryCount: logs.length,

      targetHours,
      loggedHours,
      hoursRemaining: Math.max(targetHours - loggedHours, 0),
      hoursPct: pct(loggedHours, targetHours),
      hoursComplete: targetHours > 0 && loggedHours >= targetHours,

      monthlyBudget,
      spentThisMonth,
      budgetRemaining: monthlyBudget - spentThisMonth, // may go negative
      budgetPct: pct(spentThisMonth, monthlyBudget),
      overBudget: monthlyBudget > 0 && spentThisMonth > monthlyBudget,

      loggedToday: logs.some((l) => l.entry_date === todayISO()),
    }
  }, [logs, profile])

  return {
    profile,
    logs,
    stats,
    loading,
    error,
    reload: load,
    addLog,
    updateLog,
    deleteLog,
    saveTargets,
  }
}
