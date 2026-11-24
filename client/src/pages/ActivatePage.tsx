import { FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { ErrorBanner, Modal, PasswordInput } from '../components/ui';

// Two steps on one page:
//  1. no ?token → ask for email and send an activation link
//  2. ?token=…  → let the user choose a password
export function ActivatePage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  return token ? <SetPasswordForm token={token} /> : <RequestLinkForm accountType={params.get('type') ?? 'customer'} />;
}

function RequestLinkForm({ accountType }: { accountType: string }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  // Only present when the server runs with DEV_SHOW_ACTIVATION_LINKS=true (never in production).
  const [devLink, setDevLink] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await api<{ message: string; devActivationLink?: string | null }>('/auth/activation/request', {
        method: 'POST',
        body: { email, accountType: accountType === 'rider' ? 'rider' : 'customer' },
      });
      setMessage(result.message);
      setDevLink(result.devActivationLink);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-card card">
      <h1>Set up your password</h1>
      <p className="muted">
        Enter the email your {accountType === 'rider' ? 'rider' : 'customer'} account was registered with. We'll send
        you a one-time link to choose a password.
      </p>
      {message && (
        <Modal
          title="Check your email"
          onClose={() => {
            setMessage(null);
            setDevLink(undefined);
            setEmail('');
          }}
        >
          <p className="muted">{message}</p>
          {devLink && (
            <div className="alert dev-note">
              <strong>Development mode:</strong> no email is sent, so here is the link.
              <a href={devLink} className="btn btn-primary dev-link">
                Set my password
              </a>
            </div>
          )}
          {devLink === null && (
            <div className="alert dev-note">
              <strong>Development mode:</strong> no active {accountType} account has that email, so no link was
              created. Check the spelling, or that you picked the right sign-in page.
            </div>
          )}
        </Modal>
      )}
      <form onSubmit={handleSubmit} className="form">
        <ErrorBanner message={error} />
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <button className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send activation link'}
        </button>
      </form>
      <p className="small">
        <Link to={accountType === 'rider' ? '/rider/login' : '/login'}>Back to sign in</Link>
      </p>
    </div>
  );
}

function SetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [signInPath, setSignInPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await api<{ accountType: 'customer' | 'rider' }>('/auth/activation/complete', {
        method: 'POST',
        body: { token, password },
      });
      setSignInPath(result.accountType === 'rider' ? '/rider/login' : '/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Activation failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (signInPath) {
    return (
      <div className="auth-card card">
        <h1>You're all set</h1>
        <div className="alert alert-success">Your password has been saved.</div>
        <Link to={signInPath} className="btn btn-primary">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-card card">
      <h1>Choose a password</h1>
      <form onSubmit={handleSubmit} className="form">
        <ErrorBanner message={error} />
        <label>
          New password
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={10}
            required
            autoComplete="new-password"
          />
          <span className="hint">At least 10 characters, with a letter and a number.</span>
        </label>
        <label>
          Confirm password
          <PasswordInput
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
          />
        </label>
        <button className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save password'}
        </button>
      </form>
    </div>
  );
}
