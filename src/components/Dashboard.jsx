import { useState } from 'react'
import { Loader2, Pencil, Plus } from 'lucide-react'
import { useWorkbud } from '../hooks/useWorkbud'
import { todayISO } from '../lib/format'
import { ActivityFeed } from './ActivityFeed'
import { BudgetCard } from './BudgetCard'
import { CategoryBreakdown } from './CategoryBreakdown'
import { DashboardHeader } from './DashboardHeader'
import { ExportSheet } from './ExportSheet'
import { HeroHours } from './HeroHours'
import { JobSheet } from './JobSheet'
import { JobTabs } from './JobTabs'
import { LogSheet } from './LogSheet'
import { Onboarding } from './Onboarding'
import { PaceCard } from './PaceCard'
import { PasswordSheet } from './PasswordSheet'
import { SettingsSheet } from './SettingsSheet'
import { Sheet } from './Sheet'
import { StatTiles } from './StatTiles'
import { TodayNudge } from './TodayNudge'
import { Alert, Button, SectionHeading } from './ui'

export function Dashboard({ user }) {
  const {
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
  const [exportOpen, setExportOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
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
    <div className="relative isolate min-h-dvh pb-32">
      <DashboardHeader
        name={firstName || 'WorkBud'}
        initial={initial}
        onExport={activeJob ? () => setExportOpen(true) : null}
        onSettings={() => setSettingsOpen(true)}
      />

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
            <TodayNudge
              key={activeJob.id}
              jobId={activeJob.id}
              loggedToday={stats.loggedToday}
              onLog={() => setLogSheet({ log: null })}
            />

            {/* The job's name is already the active tab above, so this row
                carries its settings instead of repeating it. */}
            <SectionHeading
              tone="brand"
              action={
                <button
                  type="button"
                  onClick={() => setJobSheet({ job: activeJob })}
                  className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-brand"
                >
                  <Pencil size={11} />
                  Edit job
                </button>
              }
            >
              Hours
            </SectionHeading>

            <HeroHours
              logged={stats.loggedHours}
              target={stats.targetHours}
              remaining={stats.hoursRemaining}
              percent={stats.hoursPct}
              complete={stats.hoursComplete}
            />

            <PaceCard
              deadline={stats.deadline}
              weekdaysLeft={stats.weekdaysLeft}
              requiredPerDay={stats.requiredPerDay}
              behind={stats.behind}
              deadlinePassed={stats.deadlinePassed}
              complete={stats.hoursComplete}
              hourlyRate={stats.hourlyRate}
              earned={stats.earned}
              spentAllTime={stats.spentAllTime}
              net={stats.net}
              costPerHour={stats.costPerHour}
            />

            <StatTiles
              weekHours={stats.weekHours}
              avgPerDay={stats.avgPerDay}
              daysWorked={stats.daysWorked}
            />

            <SectionHeading tone="money">Money</SectionHeading>

            <BudgetCard
              spent={stats.spentThisMonth}
              budget={stats.monthlyBudget}
              remaining={stats.budgetRemaining}
              percent={stats.budgetPct}
              over={stats.overBudget}
            />

            <CategoryBreakdown totals={stats.categoryTotals} />

            <SectionHeading
              tone="neutral"
              action={
                logs.length > 0 ? (
                  <span className="shrink-0 text-[12px] font-medium text-faint">
                    {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
                  </span>
                ) : null
              }
            >
              Activity
            </SectionHeading>

            <div>
              <ActivityFeed
                logs={logs}
                expensesFor={expensesFor}
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
          // Remount when the target changes — the form seeds its state from
          // props once, so switching entries in place would keep the old values.
          key={logSheet.log?.id ?? 'new'}
          open
          log={logSheet.log}
          jobName={activeJob?.name}
          expenses={logSheet.log ? expensesFor(logSheet.log.id) : []}
          jobLogs={logs}
          onOpenExisting={(existing) => setLogSheet({ log: existing })}
          onClose={() => setLogSheet(null)}
          onSubmit={(values, items) =>
            logSheet.log
              ? updateLog(logSheet.log.id, values, items)
              : addLog(values, items)
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

      {exportOpen ? (
        <ExportSheet
          open
          job={activeJob}
          profile={profile}
          email={user.email}
          logs={logs}
          expensesFor={expensesFor}
          onClose={() => setExportOpen(false)}
        />
      ) : null}

      {settingsOpen ? (
        <SettingsSheet
          open
          profile={profile}
          email={user.email}
          onClose={() => setSettingsOpen(false)}
          onSave={saveProfile}
          onChangePassword={() => {
            // Swap rather than stack — two sheets deep has no way back.
            setSettingsOpen(false)
            setPasswordOpen(true)
          }}
        />
      ) : null}

      {passwordOpen ? (
        <PasswordSheet
          open
          email={user.email}
          onClose={() => setPasswordOpen(false)}
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
