import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, Delivery } from '../api';
import { ErrorBanner, formatDate, ProgressTracker, StatusBadge, Timeline, useLoader } from '../components/ui';

export function DeliveryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: delivery, setData, error, loading } = useLoader(() => api<Delivery>(`/deliveries/${id}`), [id]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  async function cancel() {
    if (!confirm('Cancel this delivery?')) return;
    setCancelling(true);
    setActionError(null);
    try {
      setData(await api<Delivery>(`/deliveries/${id}/cancel`, { method: 'PATCH' }));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not cancel delivery');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
      <p>
        <Link to="/deliveries">← All deliveries</Link>
      </p>
      <ErrorBanner message={error ?? actionError} />
      {loading && !delivery && <p className="muted">Loading…</p>}

      {delivery && (
        <>
          <div className="page-head">
            <div>
              <h1 className="tracking-lg">{delivery.trackingCode}</h1>
              <p className="muted">Booked {formatDate(delivery.createdAt)}</p>
            </div>
            <StatusBadge status={delivery.status} />
          </div>

          <div className="card">
            <ProgressTracker status={delivery.status} />
          </div>

          <div className="grid-2">
            <div className="card">
              <h2>Details</h2>
              <dl className="details">
                <dt>Pickup</dt>
                <dd>{delivery.pickupAddress}</dd>
                <dt>Drop-off</dt>
                <dd>{delivery.deliveryAddress}</dd>
                <dt>Recipient</dt>
                <dd>
                  {delivery.recipient.name} · {delivery.recipient.phone}
                </dd>
                <dt>Package</dt>
                <dd>
                  {delivery.package.description}
                  {delivery.package.weightKg != null && ` · ${delivery.package.weightKg} kg`}
                </dd>
                {delivery.notes && (
                  <>
                    <dt>Notes</dt>
                    <dd>{delivery.notes}</dd>
                  </>
                )}
                <dt>Rider</dt>
                <dd>{delivery.rider ? `${delivery.rider.name} · ${delivery.rider.phone}` : 'Not yet assigned'}</dd>
              </dl>
              {delivery.status === 'pending' && (
                <button className="btn btn-danger" onClick={cancel} disabled={cancelling}>
                  {cancelling ? 'Cancelling…' : 'Cancel delivery'}
                </button>
              )}
            </div>

            <div className="card">
              <h2>Tracking history</h2>
              <Timeline history={delivery.history ?? []} />
            </div>
          </div>
        </>
      )}
    </>
  );
}
