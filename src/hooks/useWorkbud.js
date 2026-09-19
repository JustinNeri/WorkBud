import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, errorMessage } from '../lib/supabase'
import {
  addWeekdays,
  daysLeftInMonth,
  daysUntil,
  effectiveHours,
  monthEndISO,
  monthStartISO,
  setCurrency,
  toISODate,
  todayISO,
  weekdaysUntil,
} from '../lib/format'

/** Feed order: newest entry_date first, ties broken by newest created_at. */
function byNewest(a, b) {
  if (a.entry_date !== b.entry_date) return a.entry_date < b.entry_date ? 1 : -1
  return a.created_at < b.created_at ? 1 : -1
}

const JOB_COLS =
  'id, name, target_hours, monthly_budget, daily_budget, deadline, hourly_rate, daily_hours, start_date, sort_order, created_at'

const LOG_COLS =
  'id, job_id, entry_date, hours_worked, amount_spent, description, time_in, time_out, break_minutes, absent, created_at'

const EXPENSE_COLS = 'id, log_id, label, amount, category, created_at'

const MILESTONE_COLS =
  'id, job_id, title, due_date, target_hours, done_at, created_at'

/** Open milestones first, soonest due (undated last); finished ones after,
 *  most recently finished first. */
function byMilestone(a, b) {
  if (Boolean(a.done_at) !== Boolean(b.done_at)) return a.done_at ? 1 : -1
  if (a.done_at) return a.done_at < b.done_at ? 1 : -1
  if (a.due_date !== b.due_date) {
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return a.due_date < b.due_date ? -1 : 1
  }
  return a.created_at < b.created_at ? -1 : 1
}

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
  const [allMilestones, setAllMilestones] = useState([])
  const [activeJobId, setActiveJobId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // Today's hours grow with the clock, so the derived figures need a heartbeat
  // to recompute against. A minute is finer than the numbers can show.
  const [minuteTick, setMinuteTick] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setMinuteTick(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  const load = useCallback(async () => {
    const [profileRes, jobsRes, logsRes, expensesRes, milestonesRes] = await Promise.all([
      supabase
        .from('profiles')
        .select(
          'id, first_name, last_name, middle_initial, age, occupation, currency, avatar_path, onboarded_at',
        )
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('jobs')
        .select(JOB_COLS)
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
      supabase.from('milestones').select(MILESTONE_COLS),
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
    if (!milestonesRes.error) setAllMilestones(milestonesRes.data ?? [])

    const failure =
      profileRes.error ||
      jobsRes.error ||
      logsRes.error ||
      expensesRes.error ||
      milestonesRes.error
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

  const milestones = useMemo(
    () => allMilestones.filter((m) => m.job_id === activeJobId).sort(byMilestone),
    [allMilestones, activeJobId],
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
            category: i.category ?? 'other',
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
        .select(JOB_COLS)
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
      .select(JOB_COLS)
      .single()

    if (err) return { error: errorMessage(err) }
    setJobs((prev) => prev.map((j) => (j.id === id ? data : j)))
    return {}
  }, [])

  const deleteJob = useCallback(
    async (id) => {
      const { error: err } = await supabase.from('jobs').delete().eq('id', id)
      if (err) return { error: errorMessage(err) }

      const remaining = jobs.filter((j) => j.id !== id)
      // The FK cascades in the database; mirror that locally.
      setJobs(remaining)
      setAllExpenses((prev) => {
        const gone = new Set(
          allLogs.filter((l) => l.job_id === id).map((l) => l.id),
        )
        return prev.filter((e) => !gone.has(e.log_id))
      })
      setAllLogs((prev) => prev.filter((l) => l.job_id !== id))
      setAllMilestones((prev) => prev.filter((m) => m.job_id !== id))
      // Land on a neighbouring job. Clearing the tab outright showed the
      // "No job yet" empty state even when other jobs were still listed
      // above it, which read as though the delete had taken everything.
      setActiveJobId((current) =>
        current === id ? (remaining[0]?.id ?? null) : current,
      )
      return {}
    },
    [allLogs, jobs],
  )

  // --- milestone mutations, scoped to the active job like logs
  const addMilestone = useCallback(
    async (values) => {
      if (!activeJobId) return { error: 'Create a job first.' }
      const { data, error: err } = await supabase
        .from('milestones')
        .insert({ ...values, user_id: userId, job_id: activeJobId })
        .select(MILESTONE_COLS)
        .single()

      if (err) return { error: errorMessage(err) }
      setAllMilestones((prev) => [...prev, data])
      return {}
    },
    [userId, activeJobId],
  )

  const updateMilestone = useCallback(async (id, values) => {
    const { data, error: err } = await supabase
      .from('milestones')
      .update(values)
      .eq('id', id)
      .select(MILESTONE_COLS)
      .single()

    if (err) return { error: errorMessage(err) }
    setAllMilestones((prev) => prev.map((m) => (m.id === id ? data : m)))
    return {}
  }, [])

  const deleteMilestone = useCallback(async (id) => {
    const { error: err } = await supabase.from('milestones').delete().eq('id', id)
    if (err) return { error: errorMessage(err) }
    setAllMilestones((prev) => prev.filter((m) => m.id !== id))
    return {}
  }, [])

  /** Tick or untick. Optimistic — a checkbox that waits on the network reads
   *  as broken — and rolled back with the dashboard error if the write fails. */
  const toggleMilestone = useCallback(async (milestone) => {
    const doneAt = milestone.done_at ? null : new Date().toISOString()
    const set = (value) =>
      setAllMilestones((prev) =>
        prev.map((m) => (m.id === milestone.id ? { ...m, done_at: value } : m)),
      )

    set(doneAt)
    const { error: err } = await supabase
      .from('milestones')
      .update({ done_at: doneAt })
      .eq('id', milestone.id)
    if (err) {
      set(milestone.done_at)
      setError(errorMessage(err))
    }
  }, [])

  const saveProfile = useCallback(
    async (values) => {
      const { data, error: err } = await supabase
        .from('profiles')
        .update(values)
        .eq('id', userId)
        .select(
          'id, first_name, last_name, middle_initial, age, occupation, currency, avatar_path, onboarded_at',
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
    // 0 means the user hasn't set a daily cap; nothing about it is shown then.
    const dailyBudget = Number(activeJob?.daily_budget) || 0

    // Counted so far, not planned: a 7am–5pm day is 2h at 9am.
    const now = new Date(minuteTick)
    const loggedHours = logs.reduce((sum, l) => sum + effectiveHours(l, now), 0)
    const firstOfMonth = monthStartISO()
    const thisMonth = logs.filter((l) => l.entry_date >= firstOfMonth)
    const spentThisMonth = thisMonth.reduce(
      (sum, l) => sum + Number(l.amount_spent),
      0,
    )

    const pct = (value, total) =>
      total > 0 ? Math.min((value / total) * 100, 100) : 0

    // Rolling 7 days, and an average over days actually worked (not calendar
    // days) — otherwise a weekend off drags the number down misleadingly.
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 6)
    const weekStart = toISODate(weekAgo)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const weekHours = logs
      .filter((l) => l.entry_date >= weekStart)
      .reduce((sum, l) => sum + effectiveHours(l, now), 0)

    const daysWorked = new Set(
      logs.filter((l) => effectiveHours(l, now) > 0).map((l) => l.entry_date),
    ).size

    // Only the rate survives here. The all-time spend, earnings, net and
    // cost-per-hour it used to feed were the pace card's "what this placement
    // has cost you" half, which was removed — the money section further down
    // the page already owns that question.
    const hourlyRate = Number(activeJob?.hourly_rate) || 0

    // --- pace. Weekdays only; a 7-day figure isn't something anyone can act on.
    const deadline = activeJob?.deadline ?? null
    const startDate = activeJob?.start_date ?? null
    const hoursLeft = Math.max(targetHours - loggedHours, 0)
    const weekdaysLeft = deadline ? weekdaysUntil(deadline) : null
    const requiredPerDay =
      weekdaysLeft && weekdaysLeft > 0 ? hoursLeft / weekdaysLeft : null

    // Days recorded as not worked. These are real rows carrying zero hours,
    // not gaps, so they already hold hoursLeft up — which is exactly how a
    // missed day pushes the projected finish out below. Nothing extra has to
    // be done to "penalise" an absence; the arithmetic does it.
    const daysAbsent = new Set(
      logs.filter((l) => l.absent).map((l) => l.entry_date),
    ).size

    // Today counts as a day still available to work unless it is already
    // logged, in which case projecting from it would count it twice. Shared
    // with the hour badges further down.
    const projectFrom = logs.some((l) => l.entry_date === todayISO())
      ? toISODate(tomorrow)
      : todayISO()

    // --- when this actually finishes, at the pace the user says they work.
    //
    // requiredPerDay answers "how hard would I have to push to hit the
    // deadline". This answers the question people actually ask, which is
    // "carrying on as I am, when do I land" — remaining hours divided by a
    // normal day's hours, counted out in weekdays.
    const dailyHours = Number(activeJob?.daily_hours) || 0
    const expectedFinish =
      hoursLeft > 0 && dailyHours > 0
        ? addWeekdays(projectFrom, hoursLeft / dailyHours)
        : null
    // Positive means it lands after the deadline, in calendar days — which is
    // what someone asking "am I going to make it" is counting in.
    const finishVsDeadline =
      expectedFinish && deadline ? daysUntil(expectedFinish, deadline) : null

    // --- the month so far, for a job that has no deadline to count down to.
    // Projection runs from tomorrow so today isn't counted twice, and leans on
    // the average over days actually worked rather than calendar days.
    const monthHours = thisMonth.reduce((sum, l) => sum + effectiveHours(l, now), 0)
    const monthDaysWorked = new Set(
      thisMonth.filter((l) => effectiveHours(l, now) > 0).map((l) => l.entry_date),
    ).size
    const monthDaysAvg = monthDaysWorked > 0 ? monthHours / monthDaysWorked : 0
    const weekdaysLeftInMonth = weekdaysUntil(monthEndISO(), toISODate(tomorrow))
    const projectedMonthHours = monthHours + monthDaysAvg * weekdaysLeftInMonth

    // --- the daily cap. Totalled per calendar date rather than per entry: two
    // shifts on one day are one day's spending, and one day's allowance.
    const spentByDate = new Map()
    for (const l of logs) {
      spentByDate.set(
        l.entry_date,
        (spentByDate.get(l.entry_date) ?? 0) + Number(l.amount_spent),
      )
    }
    const spentToday = spentByDate.get(todayISO()) ?? 0
    // date → how much that day went over. A map rather than a set, so a row in
    // the feed can say by how much instead of only that it happened.
    //
    // This one stays strictly per-day: a day that broke the cap did break it,
    // and no amount of thrift afterwards makes that untrue. It is a record of
    // what happened, not a balance.
    const overDates = new Map()
    if (dailyBudget > 0) {
      for (const [date, amount] of spentByDate) {
        if (amount <= dailyBudget) continue
        overDates.set(date, amount - dailyBudget)
      }
    }
    const daysOverThisMonth = [...overDates.keys()].filter(
      (d) => d >= firstOfMonth,
    ).length

    // --- catching up. The overspend spread across the days the month has left,
    // which is the number that turns "you went over" into something to do about
    // it. Counting today in: the day it's read is a day it can be acted on.
    //
    // This used to be the sum of each day's excess and nothing else, so it
    // counted every day you went over and ignored every day you came in under.
    // That only holds together if days cannot compensate for one another — but
    // compensating is precisely what this card asks you to do with the rest of
    // the month. Allowing future thrift to count while past thrift did not is
    // what left a month sitting at ₱1,410 of a ₱5,000 budget still insisting
    // there was ₱410 to make back, with a zero-spend day doing nothing to it.
    //
    // It is now a net position: what the daily cap has allowed so far, against
    // what was actually spent. The allowance accrues from the first day logged
    // this month rather than from the 1st, so someone who starts tracking
    // mid-month doesn't bank credit for days they were never watching.
    const firstEntryThisMonth = thisMonth.reduce(
      (earliest, l) =>
        earliest === null || l.entry_date < earliest ? l.entry_date : earliest,
      null,
    )
    const allowanceToDate =
      dailyBudget *
      Math.max(
        firstEntryThisMonth ? daysUntil(todayISO(), firstEntryThisMonth) + 1 : 1,
        1,
      )
    const overspentThisMonth =
      dailyBudget > 0 ? Math.max(spentThisMonth - allowanceToDate, 0) : 0

    const daysLeft = daysLeftInMonth()
    const catchUpPerDay = overspentThisMonth > 0 ? overspentThisMonth / daysLeft : 0
    const catchUpTarget = dailyBudget - catchUpPerDay

    // --- hour badges. Walk the days oldest first and note the date the running
    // total first crossed each quarter of the target. For those still ahead,
    // project a date from the average over days actually worked — starting
    // tomorrow if today is already logged, so today isn't counted twice.
    const hourBadges = []
    if (targetHours > 0) {
      const thresholds = [25, 50, 75, 100].map((percent) => ({
        percent,
        hours: (targetHours * percent) / 100,
      }))
      const reached = new Map()
      let running = 0
      for (const l of [...logs].reverse()) {
        running += effectiveHours(l, now)
        for (const t of thresholds) {
          if (!reached.has(t.percent) && running >= t.hours) {
            reached.set(t.percent, l.entry_date)
          }
        }
      }

      const avgWorked = daysWorked > 0 ? loggedHours / daysWorked : 0
      for (const t of thresholds) {
        const reachedOn = reached.get(t.percent) ?? null
        hourBadges.push({
          ...t,
          reachedOn,
          projectedOn:
            !reachedOn && avgWorked > 0
              ? addWeekdays(projectFrom, (t.hours - loggedHours) / avgWorked)
              : null,
        })
      }
    }

    // --- where the money goes
    const logIds = new Set(logs.map((l) => l.id))
    const byCategory = new Map()
    for (const e of allExpenses) {
      if (!logIds.has(e.log_id)) continue
      byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + Number(e.amount))
    }
    const categoryTotals = [...byCategory.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)

    return {
      hourlyRate,

      deadline,
      startDate,
      dailyHours,
      daysAbsent,
      expectedFinish,
      finishVsDeadline,
      weekdaysLeft,
      requiredPerDay,
      // Behind only counts once we know both the pace needed and the pace held.
      behind:
        requiredPerDay !== null &&
        daysWorked > 0 &&
        requiredPerDay > loggedHours / daysWorked,
      deadlinePassed: Boolean(deadline) && weekdaysLeft === 0 && hoursLeft > 0,

      monthHours,
      monthDaysWorked,
      monthEarned: monthHours * hourlyRate,
      weekdaysLeftInMonth,
      // Only worth showing once there's enough history to extrapolate from.
      projectedMonthHours: monthDaysWorked > 0 ? projectedMonthHours : null,

      categoryTotals,
      hourBadges,

      weekHours,
      daysWorked,
      avgPerDay: daysWorked > 0 ? loggedHours / daysWorked : 0,
      entryCount: logs.length,

      targetHours,
      loggedHours,
      hoursRemaining: Math.max(targetHours - loggedHours, 0),
      hoursPct: pct(loggedHours, targetHours),
      hoursComplete: targetHours > 0 && loggedHours >= targetHours,

      dailyBudget,
      spentToday,
      dailyRemaining: dailyBudget - spentToday,
      overToday: dailyBudget > 0 && spentToday > dailyBudget,
      overDates,
      daysOverThisMonth,
      overspentThisMonth,
      daysLeftInMonth: daysLeft,
      catchUpPerDay,
      catchUpTarget,
      // Below zero means the rest of the month can't absorb it even at a
      // standstill, which needs a different sentence.
      canCatchUp: catchUpTarget > 0,

      monthlyBudget,
      spentThisMonth,
      budgetRemaining: monthlyBudget - spentThisMonth, // may go negative
      budgetPct: pct(spentThisMonth, monthlyBudget),
      overBudget: monthlyBudget > 0 && spentThisMonth > monthlyBudget,

      loggedToday: logs.some((l) => l.entry_date === todayISO()),
    }
  }, [logs, activeJob, allExpenses, minuteTick])

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
    milestones,
    stats,
    loading,
    error,
    reload: load,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    toggleMilestone,
    addLog,
    updateLog,
    deleteLog,
    addJob,
    updateJob,
    deleteJob,
    saveProfile,
  }
}
