import { useState } from 'react'
import { Loader2, Pencil, Plus, Settings } from 'lucide-react'
import { useWorkbud } from '../hooks/useWorkbud'
import { todayISO } from '../lib/format'
import { ActivityFeed } from './ActivityFeed'
import { BudgetCard } from './BudgetCard'
import { HeroHours } from './HeroHours'
import { JobSheet } from './JobSheet'
import { JobTabs } from './JobTabs'
import { LogSheet } from './LogSheet'
import { Onboarding } from './Onboarding'
import { SettingsSheet } from './SettingsSheet'
import { Sheet } from './Sheet'
import { StatTiles } from './StatTiles'
import { Alert, Button } from './ui'

export function Dashboard({ user }) {
  const {
    profile,
    jobs,
    activeJob,
    activeJobId,
    setActiveJobId,
    logs,
    stats,
    loading,
    error,
    reload,
    addLog,
    updateLog,
    deleteLog,
    addJob,
    updateJob,
    deleteJob,
    saveProfile,
  } = useWorkbud(user.id)

  // Each sheet is mounted only while open so its form state starts fresh.
  const [logSheet, setLogSheet] = useState(null) // null | { log: log|null }
  const [jobSheet, setJobSheet] = useState(null) // null | { job: job|null }
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [deleteError, setDeleteError] = useState(null)

  async function confirmDelete() {
    const target = pendingDelete
    setDeletingId(target.id)
    setDeleteError(null)

    const { error: err } = await deleteLog(target.id)

    setDeletingId(null)
    if (err) {
      setDeleteError(err)
      return
    }
    setPendingDelete(null)
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 size={26} className="animate-spin text-muted" />
      </div>
    )
  }

  // First run: collect name, age, occupation, currency and the first job.
  if (profile && !profile.onboarded_at) {
    return <Onboarding userId={user.id} onDone={reload} />
  }

  const firstName = profile?.first_name?.trim()
  const initial = (firstName?.[0] ?? user.email?.[0] ?? '?').toUpperCase()

  return (
    <div className="min-h-dvh pb-32">
      <header className="flex items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-hero text-[15px] font-bold text-white">
            {initial}
          </span>
          <div className="min-w-0">
            <p className="text-[12.5px] leading-tight text-muted">Welcome back</p>
            <h1 className="truncate text-[19px] font-bold leading-tight tracking-tight">
              {firstName || 'WorkBud'}
            </h1>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
          className="shrink-0 rounded-full bg-surface p-2.5 text-muted shadow-card transition active:brightness-95"
        >
          <Settings size={20} />
        </button>
      </header>

      <div className="px-5 pb-3">
        <JobTabs
          jobs={jobs}
          activeJobId={activeJobId}
          onSelect={setActiveJobId}
          onAdd={() => setJobSheet({ job: null })}
        />
      </div>

      <main className="flex flex-col gap-3 px-5">
        {error ? <Alert>{error}</Alert> : null}

        {!activeJob ? (
          <div className="rounded-2xl bg-surface px-6 py-12 text-center shadow-card">
            <p className="text-[15px] font-semibold">No job yet</p>
            <p className="mt-1 mb-4 text-[13px] text-muted">
              Add a job to start tracking hours and spending.
            </p>
            <Button onClick={() => setJobSheet({ job: null })}>
              <Plus size={17} />
              Add a job
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-1">
              <h2 className="truncate text-[13px] font-bold uppercase tracking-wide text-faint">
                {activeJob.name}
              </h2>
              <button
                type="button"
                onClick={() => setJobSheet({ job: activeJob })}
                className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand"
              >
                <Pencil size={12} />
                Edit
              </button>
            </div>

            <HeroHours
              logged={stats.loggedHours}
              target={stats.targetHours}
              remaining={stats.hoursRemaining}
              percent={stats.hoursPct}
              complete={stats.hoursComplete}
            />

            <StatTiles
              weekHours={stats.weekHours}
              avgPerDay={stats.avgPerDay}
              daysWorked={stats.daysWorked}
            />

            <BudgetCard
              spent={stats.spentThisMonth}
              budget={stats.monthlyBudget}
              remaining={stats.budgetRemaining}
              percent={stats.budgetPct}
              over={stats.overBudget}
            />

            <div className="mt-2">
              <ActivityFeed
                logs={logs}
                deletingId={deletingId}
                todayISO={todayISO()}
                onEdit={(log) => setLogSheet({ log })}
                onDelete={(log) => {
                  setDeleteError(null)
                  setPendingDelete(log)
                }}
              />
            </div>
          </>
        )}
      </main>

      {activeJob ? (
        <button
          type="button"
          onClick={() => setLogSheet({ log: null })}
          aria-label="Log an entry"
          className="fixed right-5 bottom-[max(1.5rem,env(safe-area-inset-bottom))] flex size-14 items-center justify-center rounded-full bg-hero text-white shadow-hero transition active:scale-95"
        >
          <Plus size={26} />
        </button>
      ) : null}

      {logSheet ? (
        <LogSheet
          open
          log={logSheet.log}
          jobName={activeJob?.name}
          onClose={() => setLogSheet(null)}
          onSubmit={(values) =>
            logSheet.log ? updateLog(logSheet.log.id, values) : addLog(values)
          }
        />
      ) : null}

      {jobSheet ? (
        <JobSheet
          open
          job={jobSheet.job}
          canDelete={jobs.length > 1}
          onClose={() => setJobSheet(null)}
          onSubmit={(values) =>
            jobSheet.job ? updateJob(jobSheet.job.id, values) : addJob(values)
          }
          onDelete={deleteJob}
        />
      ) : null}

      {settingsOpen ? (
        <SettingsSheet
          open
          profile={profile}
          email={user.email}
          onClose={() => setSettingsOpen(false)}
          onSave={saveProfile}
        />
      ) : null}

      {pendingDelete ? (
        <Sheet open onClose={() => setPendingDelete(null)} title="Delete entry?">
          <p className="text-[15px] leading-snug text-muted">
            This entry will be removed from your history. This can&apos;t be undone.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Alert>{deleteError}</Alert>
            <Button
              variant="danger"
              busy={deletingId === pendingDelete.id}
              onClick={confirmDelete}
            >
              Delete
            </Button>
            <Button variant="secondary" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
          </div>
        </Sheet>
      ) : null}
    </div>
  )
}
