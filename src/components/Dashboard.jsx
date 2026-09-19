import { useState } from 'react'
import { CalendarPlus, Loader2, Pencil, Plus } from 'lucide-react'
import { useWorkbud } from '../hooks/useWorkbud'
import { avatarUrl } from '../lib/avatar'
import { daysAgoISO, isOngoingRole, todayISO } from '../lib/format'
import { ActivityFeed } from './ActivityFeed'
import { BudgetCard } from './BudgetCard'
import { CatchUpCard } from './CatchUpCard'
import { CategoryBreakdown } from './CategoryBreakdown'
import { DashboardHeader } from './DashboardHeader'
import { ExportSheet } from './ExportSheet'
import { HeroHours } from './HeroHours'
import { JobSheet } from './JobSheet'
import { JobTabs } from './JobTabs'
import { LogSheet } from './LogSheet'
import { MilestoneSheet } from './MilestoneSheet'
import { MilestonesCard } from './MilestonesCard'
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
    milestones,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    toggleMilestone,
  } = useWorkbud(user.id)

  // Each sheet is mounted only while open so its form state starts fresh.
  // null | { log } to edit, or { log: null, date } to add — date seeds the
  // form, so "Add past day" opens on yesterday rather than today.
  const [logSheet, setLogSheet] = useState(null)
  const [jobSheet, setJobSheet] = useState(null) // null | { job: job|null }
  const [milestoneSheet, setMilestoneSheet] = useState(null) // null | { milestone }
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
        avatarUrl={avatarUrl(profile?.avatar_path)}
        onExport={activeJob ? () => setExportOpen(true) : null}
        onSettings={() => setSettingsOpen(true)}
      />

      <div className="wb-shell pb-3">
        <JobTabs
          jobs={jobs}
          activeJobId={activeJobId}
          onSelect={setActiveJobId}
          onAdd={() => setJobSheet({ job: null })}
        />
      </div>

      <main className="wb-shell flex flex-col gap-3">
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

            {/* Two columns from lg up, on the seam the page already had: the
                hours and the checkpoints that measure them on one side, the
                money and the day-by-day feed on the other.

                Stacked, the children fall in exactly the order the single
                column used, so nothing about the phone layout changes. The
                split exists because the cards were drawn at phone width — left
                as one column on a monitor they either stretch to 1900px around
                a 158px ring, or sit in a narrow strip with the rest of the
                screen empty. Two columns of roughly phone width use the room
                without redrawing a single card.

                items-start so a short column doesn't stretch to match a long
                one; each stack keeps its own height. */}
            <div className="grid gap-3 lg:grid-cols-2 lg:items-start lg:gap-x-7">
              <div className="flex flex-col gap-3">
                {/* The job's name is already the active tab above, so this row
                    carries its settings instead of repeating it. */}
                <SectionHeading
                  tone="brand"
                  action={
                    <button
                      type="button"
                      onClick={() => setJobSheet({ job: activeJob })}
                      className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-[12px] font-semibold text-brand hover:underline hover:underline-offset-2"
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
                  deadline={stats.deadline}
                  expectedFinish={stats.expectedFinish}
                  finishVsDeadline={stats.finishVsDeadline}
                />

                <PaceCard
                  deadline={stats.deadline}
                  weekdaysLeft={stats.weekdaysLeft}
                  requiredPerDay={stats.requiredPerDay}
                  behind={stats.behind}
                  deadlinePassed={stats.deadlinePassed}
                  complete={stats.hoursComplete}
                  ongoing={isOngoingRole(profile?.occupation)}
                  entryCount={stats.entryCount}
                  daysAbsent={stats.daysAbsent}
                  monthHours={stats.monthHours}
                  monthDaysWorked={stats.monthDaysWorked}
                  monthEarned={stats.monthEarned}
                  projectedMonthHours={stats.projectedMonthHours}
                  hourlyRate={stats.hourlyRate}
                />

                <StatTiles
                  weekHours={stats.weekHours}
                  avgPerDay={stats.avgPerDay}
                  daysWorked={stats.daysWorked}
                />

                <SectionHeading
                  tone="brand"
                  action={
                    <button
                      type="button"
                      onClick={() => setMilestoneSheet({ milestone: null })}
                      className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-[12px] font-semibold text-brand hover:underline hover:underline-offset-2"
                    >
                      <Plus size={12} />
                      Add milestone
                    </button>
                  }
                >
                  Milestones
                </SectionHeading>

                <MilestonesCard
                  milestones={milestones}
                  badges={stats.hourBadges}
                  loggedHours={stats.loggedHours}
                  avgPerDay={stats.avgPerDay}
                  onAdd={() => setMilestoneSheet({ milestone: null })}
                  onEdit={(milestone) => setMilestoneSheet({ milestone })}
                  onToggle={toggleMilestone}
                />
              </div>

              {/* Money leads this column, so its heading is the first child and
                  loses the top margin that separated it from the hours above.
                  Stacked on a phone that margin is still wanted — the two
                  groups are back to being one scroll. */}
              <div className="flex flex-col gap-3 max-lg:mt-2">
                <SectionHeading tone="money">Money</SectionHeading>

                <BudgetCard
                  spent={stats.spentThisMonth}
                  budget={stats.monthlyBudget}
                  remaining={stats.budgetRemaining}
                  percent={stats.budgetPct}
                  over={stats.overBudget}
                  dailyBudget={stats.dailyBudget}
                  spentToday={stats.spentToday}
                  dailyRemaining={stats.dailyRemaining}
                  overToday={stats.overToday}
                  daysOverThisMonth={stats.daysOverThisMonth}
                />

                <CatchUpCard
                  overspent={stats.overspentThisMonth}
                  perDay={stats.catchUpPerDay}
                  target={stats.catchUpTarget}
                  dailyBudget={stats.dailyBudget}
                  daysLeft={stats.daysLeftInMonth}
                  canCatchUp={stats.canCatchUp}
                />

                <CategoryBreakdown totals={stats.categoryTotals} />

                <SectionHeading
                  tone="neutral"
                  action={
                    /* Backfilling is the whole reason someone can pick a date in
                       the sheet at all — people find this app partway through a
                       placement. The button says so, instead of leaving it to be
                       discovered by opening the date picker. */
                    <>
                      {logs.length > 0 ? (
                        <span className="shrink-0 text-[12px] font-medium text-faint">
                          {logs.length}
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() =>
                          setLogSheet({ log: null, date: daysAgoISO(1) })
                        }
                        className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-[12px] font-semibold text-brand hover:underline hover:underline-offset-2"
                      >
                        <CalendarPlus size={12} />
                        Add past day
                      </button>
                    </>
                  }
                >
                  Activity
                </SectionHeading>

                <ActivityFeed
                  logs={logs}
                  expensesFor={expensesFor}
                  deletingId={deletingId}
                  todayISO={todayISO()}
                  overDates={stats.overDates}
                  onEdit={(log) => setLogSheet({ log })}
                  onDelete={(log) => {
                    setDeleteError(null)
                    setPendingDelete(log)
                  }}
                />
              </div>
            </div>
          </>
        )}
      </main>

      {/* Fixed, but measured by the content column rather than the window.
          Pinned to the viewport's right edge it ended up stranded in the empty
          margin on a monitor, a long way from the cards it acts on; spanning
          the column instead lands it against the content's own right edge at
          every width, and unchanged on a phone. The positioner stays
          click-through so it never blocks the page beneath it. */}
      {activeJob ? (
        <div className="wb-shell pointer-events-none fixed inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-30">
          <button
            type="button"
            onClick={() => setLogSheet({ log: null })}
            aria-label="Log an entry"
            className="pointer-events-auto ml-auto flex size-14 cursor-pointer items-center justify-center rounded-full bg-action text-white shadow-hero transition hover:brightness-110 active:scale-95"
          >
            <Plus size={26} />
          </button>
        </div>
      ) : null}

      {logSheet ? (
        <LogSheet
          // Remount when the target changes — the form seeds its state from
          // props once, so switching entries in place would keep the old values.
          key={logSheet.log?.id ?? logSheet.date ?? 'new'}
          open
          log={logSheet.log}
          initialDate={logSheet.date}
          jobName={activeJob?.name}
          dailyBudget={stats.dailyBudget}
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
          lastJob={jobs.length === 1}
          onClose={() => setJobSheet(null)}
          onSubmit={(values) =>
            jobSheet.job ? updateJob(jobSheet.job.id, values) : addJob(values)
          }
          onDelete={deleteJob}
        />
      ) : null}

      {milestoneSheet ? (
        <MilestoneSheet
          open
          milestone={milestoneSheet.milestone}
          targetHours={stats.targetHours}
          onClose={() => setMilestoneSheet(null)}
          onSubmit={(values) =>
            milestoneSheet.milestone
              ? updateMilestone(milestoneSheet.milestone.id, values)
              : addMilestone(values)
          }
          onDelete={deleteMilestone}
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
          userId={user.id}
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
