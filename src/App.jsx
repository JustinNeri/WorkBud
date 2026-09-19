import { Loader2 } from 'lucide-react'
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router'
import { isConfigured } from './lib/supabase'
import { useSession } from './hooks/useSession'
import { AuthScreen } from './components/AuthScreen'
import { Dashboard } from './components/Dashboard'
import { ForgotPassword } from './components/ForgotPassword'

/**
 * Signed-out users get sent to /login, remembering where they were headed so
 * signing in lands them back there rather than always on the dashboard.
 */
function RequireSession({ session }) {
  const location = useLocation()
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}

/**
 * The auth screens only make sense signed out. This is also what moves the
 * user on after signing in, verifying a signup code or resetting a password:
 * the session appears and this redirects, just as the old conditional render
 * swapped the screen out.
 */
function GuestOnly({ session }) {
  const location = useLocation()
  if (session) {
    const from = location.state?.from
    const to = from ? `${from.pathname}${from.search}${from.hash}` : '/dashboard'
    return <Navigate to={to} replace />
  }
  return <Outlet />
}

function ForgotPasswordRoute() {
  const navigate = useNavigate()
  const location = useLocation()
  return (
    <ForgotPassword
      initialEmail={location.state?.email ?? ''}
      onBack={() => navigate('/login', { state: location.state })}
    />
  )
}

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

  return (
    <Routes>
      <Route element={<GuestOnly session={session} />}>
        <Route path="/login" element={<AuthScreen mode="signin" />} />
        <Route path="/signup" element={<AuthScreen mode="signup" />} />
        <Route path="/forgot-password" element={<ForgotPasswordRoute />} />
      </Route>

      <Route element={<RequireSession session={session} />}>
        {/* Keyed by user so switching accounts remounts with clean data state. */}
        <Route
          path="/dashboard"
          element={
            session ? (
              <Dashboard key={session.user.id} user={session.user} />
            ) : null
          }
        />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
