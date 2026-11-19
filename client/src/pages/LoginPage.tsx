import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { homePathFor } from '../App';
import { LoginKind, useAuth } from '../auth';
import { LogisticsIllustration } from '../components/LogisticsIllustration';
import { ErrorBanner, PasswordInput } from '../components/ui';

const COPY: Record<
  LoginKind,
  { title: string; subtitle: string; activationType?: 'customer' | 'rider'; tagline: string; highlights: string[] }
> = {
  customer: {
    title: 'Sign in',
    subtitle: 'Book deliveries and track your packages.',
    activationType: 'customer',
    tagline: 'Deliveries, tracked door to door.',
    highlights: ['Book a pickup in under a minute', 'Know exactly where your parcel is', "Get notified the moment it's delivered"],
  },
  rider: {
    title: 'Rider sign in',
    subtitle: 'See your assigned jobs and update delivery status.',
    activationType: 'rider',
    tagline: 'Every drop, right on time.',
    highlights: ['See the jobs assigned to you', 'Update delivery status in one tap', 'Call recipients straight from the app'],
  },
  staff: {
    title: 'Staff sign in',
    subtitle: 'Dispatch and operations access.',
    tagline: 'Dispatch at a glance.',
    highlights: ['Assign riders to new bookings', 'Follow every delivery live', 'Spot delays before customers do'],
  },
};

export function LoginPage({ kind }: { kind: LoginKind }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const copy = COPY[kind];

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const user = await login(kind, email, password);
      navigate(homePathFor(user.role), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`auth-split card auth-${kind}`}>
      <aside className="auth-visual">
        <LogisticsIllustration vehicle={kind === 'rider' ? 'motorbike' : 'truck'} />
        <div className="auth-visual-copy">
          <h2>{copy.tagline}</h2>
          <ul>
            {copy.highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="auth-form">
        <h1>{copy.title}</h1>
        <p className="muted">{copy.subtitle}</p>

        <form onSubmit={handleSubmit} className="form">
          <ErrorBanner message={error} />
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </label>
          <label>
            Password
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          <button className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {copy.activationType && (
          <p className="muted small">
            First time here, or forgot your password?{' '}
            <Link to={`/activate?type=${copy.activationType}`}>Set up your password</Link>
          </p>
        )}
      </div>
    </div>
  );
}
