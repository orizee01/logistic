import { ReactNode } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { Role } from './api';
import { useAuth } from './auth';
import { ActivatePage } from './pages/ActivatePage';
import { AdminDashboard } from './pages/AdminDashboard';
import { CustomerDashboard } from './pages/CustomerDashboard';
import { DeliveryDetailPage } from './pages/DeliveryDetailPage';
import { LoginPage } from './pages/LoginPage';
import { NewDeliveryPage } from './pages/NewDeliveryPage';
import { RiderDashboard } from './pages/RiderDashboard';
import { ThemeSwitch } from './theme';

export function loginPathFor(role: Role): string {
  if (role === 'rider') return '/rider/login';
  if (role === 'admin' || role === 'dispatcher') return '/staff/login';
  return '/login';
}

export function homePathFor(role: Role): string {
  if (role === 'rider') return '/rider';
  if (role === 'admin' || role === 'dispatcher') return '/admin';
  return '/deliveries';
}

function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  // Send signed-out visitors to the sign-in page for the area they tried to open.
  if (!user) return <Navigate to={loginPathFor(roles[0])} replace />;
  if (!roles.includes(user.role)) return <Navigate to={homePathFor(user.role)} replace />;
  return <>{children}</>;
}

function Header() {
  const { user, logout } = useAuth();
  return (
    <header className="header">
      <Link to="/" className="brand">
        <span className="brand-mark">◆</span> SwiftDrop
      </Link>
      <div className="header-actions">
        <ThemeSwitch />
        {user && (
          <div className="header-user">
            <span className="muted">
              {user.name} · <span className="role">{user.role}</span>
            </span>
            <button className="btn btn-ghost" onClick={logout}>
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export function App() {
  const { user } = useAuth();

  return (
    <>
      <Header />
      <main className="container">
        <Routes>
          <Route path="/" element={<Navigate to={user ? homePathFor(user.role) : '/login'} replace />} />
          <Route path="/login" element={user ? <Navigate to={homePathFor(user.role)} replace /> : <LoginPage kind="customer" />} />
          <Route
            path="/rider/login"
            element={user ? <Navigate to={homePathFor(user.role)} replace /> : <LoginPage kind="rider" />}
          />
          <Route
            path="/staff/login"
            element={user ? <Navigate to={homePathFor(user.role)} replace /> : <LoginPage kind="staff" />}
          />
          <Route path="/activate" element={<ActivatePage />} />
          <Route
            path="/deliveries"
            element={
              <RequireRole roles={['customer']}>
                <CustomerDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/deliveries/new"
            element={
              <RequireRole roles={['customer']}>
                <NewDeliveryPage />
              </RequireRole>
            }
          />
          <Route
            path="/deliveries/:id"
            element={
              <RequireRole roles={['customer']}>
                <DeliveryDetailPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireRole roles={['admin', 'dispatcher']}>
                <AdminDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/rider"
            element={
              <RequireRole roles={['rider']}>
                <RiderDashboard />
              </RequireRole>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
