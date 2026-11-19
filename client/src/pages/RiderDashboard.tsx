import { useState } from 'react';
import { api, Delivery, DeliveryStatus } from '../api';
import { ErrorBanner, StatusBadge, useLoader } from '../components/ui';

interface RiderProfile {
  id: string;
  name: string;
  isAvailable: boolean;
  activeDeliveries: number;
}

const NEXT_ACTIONS: Partial<Record<DeliveryStatus, { status: DeliveryStatus; label: string }[]>> = {
  assigned: [{ status: 'picked_up', label: 'Mark picked up' }],
  picked_up: [
    { status: 'in_transit', label: 'Mark in transit' },
    { status: 'delivered', label: 'Mark delivered' },
  ],
  in_transit: [{ status: 'delivered', label: 'Mark delivered' }],
};

export function RiderDashboard() {
  const profile = useLoader(() => api<RiderProfile>('/rider/me'));
  const deliveries = useLoader(() => api<Delivery[]>('/rider/deliveries'));
  const [error, setError] = useState<string | null>(null);

  async function toggleAvailability() {
    if (!profile.data) return;
    try {
      profile.setData(
        await api<RiderProfile>('/rider/me/availability', {
          method: 'PATCH',
          body: { isAvailable: !profile.data.isAvailable },
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update availability');
    }
  }

  const active = deliveries.data?.filter((d) => d.status in NEXT_ACTIONS) ?? [];
  const completed = deliveries.data?.filter((d) => !(d.status in NEXT_ACTIONS)) ?? [];

  return (
    <>
      <div className="page-head">
        <h1>My jobs</h1>
        {profile.data && (
          <button className={`btn ${profile.data.isAvailable ? 'btn-ok' : 'btn-ghost'}`} onClick={toggleAvailability}>
            {profile.data.isAvailable ? '● On duty' : '○ Off duty'}
          </button>
        )}
      </div>

      <ErrorBanner message={error ?? deliveries.error ?? profile.error} />
      {deliveries.loading && !deliveries.data && <p className="muted">Loading…</p>}

      <h2>Active</h2>
      {deliveries.data && active.length === 0 && <div className="card empty">No active jobs right now.</div>}
      <div className="list">
        {active.map((delivery) => (
          <RiderJobCard
            key={delivery.id}
            delivery={delivery}
            onChanged={async () => {
              await Promise.all([deliveries.reload(), profile.reload()]);
            }}
          />
        ))}
      </div>

      {completed.length > 0 && (
        <>
          <h2>Completed</h2>
          <div className="list">
            {completed.map((delivery) => (
              <div key={delivery.id} className="card delivery-row">
                <div>
                  <div className="tracking">{delivery.trackingCode}</div>
                  <div className="route">{delivery.deliveryAddress}</div>
                </div>
                <StatusBadge status={delivery.status} />
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function RiderJobCard({ delivery, onChanged }: { delivery: Delivery; onChanged: () => Promise<void> }) {
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function updateStatus(status: DeliveryStatus) {
    setSaving(true);
    setError(null);
    try {
      await api(`/rider/deliveries/${delivery.id}/status`, { method: 'PATCH', body: { status, note } });
      setNote('');
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <div className="delivery-row">
        <div className="tracking">{delivery.trackingCode}</div>
        <StatusBadge status={delivery.status} />
      </div>
      <dl className="details">
        <dt>Pickup</dt>
        <dd>{delivery.pickupAddress}</dd>
        <dt>Drop-off</dt>
        <dd>{delivery.deliveryAddress}</dd>
        <dt>Recipient</dt>
        <dd>
          {delivery.recipient.name} · <a href={`tel:${delivery.recipient.phone}`}>{delivery.recipient.phone}</a>
        </dd>
        <dt>Package</dt>
        <dd>{delivery.package.description}</dd>
        {delivery.notes && (
          <>
            <dt>Notes</dt>
            <dd>{delivery.notes}</dd>
          </>
        )}
      </dl>
      <div className="assign">
        <input placeholder="Optional note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        {NEXT_ACTIONS[delivery.status]?.map((action) => (
          <button key={action.status} className="btn btn-primary" onClick={() => updateStatus(action.status)} disabled={saving}>
            {action.label}
          </button>
        ))}
      </div>
      <ErrorBanner message={error} />
    </div>
  );
}
