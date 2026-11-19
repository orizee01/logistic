import { InputHTMLAttributes, useCallback, useEffect, useState } from 'react';
import { DeliveryStatus, HistoryEntry } from '../api';

export const STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: 'Pending',
  assigned: 'Rider assigned',
  picked_up: 'Picked up',
  in_transit: 'In transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const PROGRESS: DeliveryStatus[] = ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered'];

export function StatusBadge({ status }: { status: DeliveryStatus }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABELS[status]}</span>;
}

export function ProgressTracker({ status }: { status: DeliveryStatus }) {
  if (status === 'cancelled') {
    return <p className="muted">This delivery was cancelled.</p>;
  }
  const current = PROGRESS.indexOf(status);
  return (
    <ol className="progress">
      {PROGRESS.map((step, index) => (
        <li key={step} className={index <= current ? 'done' : ''} aria-current={index === current ? 'step' : undefined}>
          <span className="progress-dot" />
          <span className="progress-label">{STATUS_LABELS[step]}</span>
        </li>
      ))}
    </ol>
  );
}

export function Timeline({ history }: { history: HistoryEntry[] }) {
  return (
    <ul className="timeline">
      {[...history].reverse().map((entry, index) => (
        <li key={index}>
          <div className="timeline-head">
            <StatusBadge status={entry.toStatus} />
            <time className="muted">{formatDate(entry.at)}</time>
          </div>
          {entry.note && <p className="timeline-note">{entry.note}</p>}
        </li>
      ))}
    </ul>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="alert alert-error" role="alert">
      {message}
    </div>
  );
}

export function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

// Fetches data on mount (and whenever `reload` is called).
export function useLoader<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await run());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [run]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, setData, error, loading, reload };
}

// Password field with a show/hide toggle. Accepts the same props as a normal <input>.
export function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="password-field">
      <input {...props} type={visible ? 'text' : 'password'} />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        title={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </span>
  );
}

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.7 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-2.2 3.1" />
      <path d="M6.6 6.6C3.9 8.3 2 12 2 12s3.5 7 10 7c1.9 0 3.6-.6 5-1.5" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m2 2 20 20" />
    </svg>
  );
}
