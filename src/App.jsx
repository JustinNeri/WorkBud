import { Loader2 } from 'lucide-react'
import { isConfigured } from './lib/supabase'
import { useSession } from './hooks/useSession'
import { AuthScreen } from './components/AuthScreen'
import { Dashboard } from './components/Dashboard'

function ConfigNotice() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <div className="max-w-sm rounded-2xl bg-surface p-6 shadow-card">
        <h1 className="text-[17px] font-semibold">Supabase isn't configured</h1>
        <p className="mt-2 text-[14px] leading-snug text-muted">
          Copy <code className="text-ink">.env.example</code> to{' '}
          <code className="text-ink">.env.local</code>, fill in your project URL
          and anon key, then restart the dev server.
        </p>
      </div>
    </div>
  )
}

export default function App() {
  const { session, loading } = useSession()

  if (!isConfigured) return <ConfigNotice />

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 size={26} className="animate-spin text-muted" />
      </div>
    )
  }

  if (!session) return <AuthScreen />

  // Keyed by user so switching accounts remounts with clean data state.
  return <Dashboard key={session.user.id} user={session.user} />
}
