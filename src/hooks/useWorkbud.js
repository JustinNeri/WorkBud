import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, errorMessage } from '../lib/supabase'
import { monthStartISO, setCurrency, toISODate, todayISO } from '../lib/format'

/** Feed order: newest entry_date first, ties broken by newest created_at. */
function byNewest(a, b) {
  if (a.entry_date !== b.entry_date) return a.entry_date < b.entry_date ? 1 : -1
  return a.created_at < b.created_at ? 1 : -1
}

const LOG_COLS =
  'id, job_id, entry_date, hours_worked, amount_spent, description, time_in, time_out, break_minutes, created_at'

const EXPENSE_COLS = 'id, log_id, label, amount, created_at'

/**
 * Profile + jobs + logs for the signed-in user, with everything derived for
 * whichever job tab is active. RLS scopes all reads server-side, so no
 * user_id filter is needed here.
 *
 * All of a user's logs are held in memory and filtered per job — a personal
 * tracker's volume is small, and it makes tab switching instant.
 */
export function useWorkbud(userId) {
  const [profile, setProfile] = useState(null)
  const [jobs, setJobs] = useState([])
  const [allLogs, setAllLogs] = useState([])
  const [allExpenses, setAllExpenses] = useState([])
  const [activeJobId, setActiveJobId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    const [profileRes, jobsRes, logsRes, expensesRes] = await Promise.all([
      supabase
        .from('profiles')
        .select(
          'id, first_name, last_name, middle_initial, age, occupation, currency, onboarded_at',
        )
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('jobs')
        .select('id, name, target_hours, monthly_budget, sort_order, created_at')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase
        .from('daily_logs')
        .select(LOG_COLS)
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('expenses')
        .select(EXPENSE_COLS)
        .order('created_at', { ascending: true }),
    ])

    if (!profileRes.error && profileRes.data) {
      setProfile(profileRes.data)
      setCurrency(profileRes.data.currency)
    }
    if (!jobsRes.error) {
      const list = jobsRes.data ?? []
      setJobs(list)
      // Keep the current tab if it still exists, else fall back to the first.
      setActiveJobId((current) =>
        current && list.some((j) => j.id === current)
          ? current
          : (list[0]?.id ?? null),
      )
    }
    if (!logsRes.error) setAllLogs(logsRes.data ?? [])
    if (!expensesRes.error) setAllExpenses(expensesRes.data ?? [])

    const failure =
      profileRes.error || jobsRes.error || logsRes.error || expensesRes.error
    setError(failure ? errorMessage(failure) : null)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    // load() fetches from Supabase — syncing with an external system is what
    // effects are for, and its setStates all happen after an await.
    // oxlint-disable-next-line react/set-state-in-effect
    load()
  }, [load])

  const activeJob = useMemo(
    () => jobs.find((j) => j.id === activeJobId) ?? null,
    [jobs, activeJobId],
  )

  const logs = useMemo(
    () => allLogs.filter((l) => l.job_id === activeJobId),
    [allLogs, activeJobId],
  )

  /**
   * A day's expense list is small and edited as a whole, so replace it wholesale
   * rather than diffing. The parent's amount_spent is written by the caller from
   * the same numbers, keeping one source of truth for the total.
   */
  const replaceExpenses = useCallback(
    async (logId, items) => {
      const { error: delErr } = await supabase
        .from('expenses')
        .delete()
        .eq('log_id', logId)
      if (delErr) return { error: errorMessage(delErr) }

      if (items.length === 0) {
        setAllExpenses((prev) => prev.filter((e) => e.log_id !== logId))
        return {}
      }

      const { data, error: insErr } = await supabase
        .from('expenses')
        .insert(
          items.map((i) => ({
            log_id: logId,
            user_id: userId,
            label: i.label,
            amount: i.amount,
          })),
        )
        .select(EXPENSE_COLS)

      if (insErr) return { error: errorMessage(insErr) }
      setAllExpenses((prev) => [
        ...prev.filter((e) => e.log_id !== logId),
        ...(data ?? []),
      ])
      return {}
    },
    [userId],
  )

  // --- log mutations, always scoped to the active job
  const addLog = useCallback(
    async (values, items = []) => {
      if (!activeJobId) return { error: 'Create a job first.' }
      const { data, error: err } = await supabase
        .from('daily_logs')
        .insert({ ...values, user_id: userId, job_id: activeJobId })
        .select(LOG_COLS)
        .single()

      if (err) return { error: errorMessage(err) }
      setAllLogs((prev) => [data, ...prev].sort(byNewest))

      if (items.length) {
        const { error: expErr } = await replaceExpenses(data.id, items)
        if (expErr) return { error: expErr }
      }
      return {}
    },
    [userId, activeJobId, replaceExpenses],
  )

  const updateLog = useCallback(
    async (id, values, items = []) => {
      const { data, error: err } = await supabase
        .from('daily_logs')
        .update(values)
        .eq('id', id)
        .select(LOG_COLS)
        .single()

      if (err) return { error: errorMessage(err) }
      setAllLogs((prev) => prev.map((l) => (l.id === id ? data : l)).sort(byNewest))

      const { error: expErr } = await replaceExpenses(id, items)
      if (expErr) return { error: expErr }
      return {}
    },
    [replaceExpenses],
  )

  const deleteLog = useCallback(
    async (id) => {
      const previous = allLogs
      setAllLogs((prev) => prev.filter((l) => l.id !== id)) // optimistic
      const { error: err } = await supabase.from('daily_logs').delete().eq('id', id)
      if (err) {
        setAllLogs(previous)
        return { error: errorMessage(err) }
      }
      // The FK cascades in the database; mirror that locally.
      setAllExpenses((prev) => prev.filter((e) => e.log_id !== id))
      return {}
    },
    [allLogs],
  )

  // --- job mutations
  const addJob = useCallback(
    async (values) => {
      const { data, error: err } = await supabase
        .from('jobs')
        .insert({ ...values, user_id: userId, sort_order: jobs.length })
        .select('id, name, target_hours, monthly_budget, sort_order, created_at')
        .single()

      if (err) return { error: errorMessage(err) }
      setJobs((prev) => [...prev, data])
      setActiveJobId(data.id) // land the user on what they just made
      return {}
    },
    [userId, jobs.length],
  )

  const updateJob = useCallback(async (id, values) => {
    const { data, error: err } = await supabase
      .from('jobs')
      .update(values)
      .eq('id', id)
      .select('id, name, target_hours, monthly_budget, sort_order, created_at')
      .single()

    if (err) return { error: errorMessage(err) }
    setJobs((prev) => prev.map((j) => (j.id === id ? data : j)))
    return {}
  }, [])

  const deleteJob = useCallback(async (id) => {
    const { error: err } = await supabase.from('jobs').delete().eq('id', id)
    if (err) return { error: errorMessage(err) }
    // The FK cascades in the database; mirror that locally.
    setJobs((prev) => prev.filter((j) => j.id !== id))
    setAllExpenses((prev) => {
      const gone = new Set(
        allLogs.filter((l) => l.job_id === id).map((l) => l.id),
      )
      return prev.filter((e) => !gone.has(e.log_id))
    })
    setAllLogs((prev) => prev.filter((l) => l.job_id !== id))
    setActiveJobId((current) => (current === id ? null : current))
    return {}
  }, [allLogs])

  const saveProfile = useCallback(
    async (values) => {
      const { data, error: err } = await supabase
        .from('profiles')
        .update(values)
        .eq('id', userId)
        .select(
          'id, first_name, last_name, middle_initial, age, occupation, currency, onboarded_at',
        )
        .single()

      if (err) return { error: errorMessage(err) }
      setProfile(data)
      setCurrency(data.currency)
      return {}
    },
    [userId],
  )

  // --- derived, for the active job only
  const stats = useMemo(() => {
    const targetHours = Number(activeJob?.target_hours) || 0
    const monthlyBudget = Number(activeJob?.monthly_budget) || 0

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
  }, [logs, activeJob])

  /** The expense line items belonging to one log, oldest first. */
  const expensesFor = useCallback(
    (logId) => allExpenses.filter((e) => e.log_id === logId),
    [allExpenses],
  )

  return {
    expensesFor,
    profile,
    jobs,
    activeJob,
    activeJobId,
    setActiveJobId,
    logs,
    stats,
    loading,
    error,
    reload: load,
    addLog,
    updateLog,
    deleteLog,
    addJob,
    updateJob,
    deleteJob,
    saveProfile,
  }
}
