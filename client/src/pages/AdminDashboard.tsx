import { useState } from 'react';
import { api, Delivery, DeliveryStatus, Rider } from '../api';
import { ErrorBanner, formatDate, STATUS_LABELS, StatusBadge, useLoader } from '../components/ui';

const FILTERS: (DeliveryStatus | '')[] = ['', 'pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'];

export function AdminDashboard() {
  const [status, setStatus] = useState<DeliveryStatus | ''>('pending');
  const deliveries = useLoader(() => api<Delivery[]>(`/admin/deliveries${status ? `?status=${status}` : ''}`), [status]);
  const riders = useLoader(() => api<Rider[]>('/admin/riders'));

  async function refresh() {
    await Promise.all([deliveries.reload(), riders.reload()]);
  }

  return (
    <>
      <div className="page-head">
        <h1>Dispatch</h1>
        <label className="inline">
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as DeliveryStatus | '')}>
            {FILTERS.map((value) => (
              <option key={value} value={value}>
                {value ? STATUS_LABELS[value] : 'All'}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ErrorBanner message={deliveries.error ?? riders.error} />

      <div className="admin-layout">
        <section>
          {deliveries.loading && !deliveries.data && <p className="muted">Loading…</p>}
          {deliveries.data?.length === 0 && <div className="card empty">No deliveries match this filter.</div>}
          <div className="list">
            {deliveries.data?.map((delivery) => (
              <AdminDeliveryCard key={delivery.id} delivery={delivery} riders={riders.data ?? []} onChanged={refresh} />
            ))}
          </div>
        </section>

        <aside className="card">
          <h2>Riders</h2>
          <ul className="rider-list">
            {riders.data?.map((rider) => (
              <li key={rider.id}>
                <div>
                  <strong>{rider.name}</strong>
                  <div className="muted small">{rider.phone}</div>
                </div>
                <div className="rider-meta">
                  {!rider.isActivated ? (
                    <span className="pill pill-muted">Not activated</span>
                  ) : rider.isAvailable ? (
                    <span className="pill pill-ok">Available</span>
                  ) : (
                    <span className="pill pill-muted">Off duty</span>
                  )}
                  <span className="muted small">{rider.activeDeliveries} active</span>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  );
}

function AdminDeliveryCard({
  delivery,
  riders,
  onChanged,
}: {
  delivery: Delivery;
  riders: Rider[];
  onChanged: () => Promise<void>;
}) {
  const [riderId, setRiderId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const canAssign = delivery.status === 'pending' || delivery.status === 'assigned';
  const assignable = riders.filter((r) => r.isActivated && r.isAvailable && r.id !== delivery.rider?.id);

  async function assign() {
    setSaving(true);
    setError(null);
    try {
      await api(`/admin/deliveries/${delivery.id}/assign`, { method: 'PATCH', body: { riderId } });
      setRiderId('');
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assignment failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <div className="delivery-row">
        <div>
          <div className="tracking">{delivery.trackingCode}</div>
          <div className="route">
            {delivery.pickupAddress} <span className="arrow">→</span> {delivery.deliveryAddress}
          </div>
          <div className="muted small">
            {delivery.customer?.name} · {delivery.package.description} · {formatDate(delivery.createdAt)}
          </div>
          {delivery.rider && <div className="small">Rider: {delivery.rider.name}</div>}
        </div>
        <StatusBadge status={delivery.status} />
      </div>

      {canAssign && (
        <div className="assign">
          <select value={riderId} onChange={(e) => setRiderId(e.target.value)} aria-label="Choose rider">
            <option value="">{delivery.rider ? 'Reassign to…' : 'Assign rider…'}</option>
            {assignable.map((rider) => (
              <option key={rider.id} value={rider.id}>
                {rider.name} ({rider.activeDeliveries} active)
              </option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={assign} disabled={!riderId || saving}>
            {saving ? 'Assigning…' : 'Assign'}
          </button>
        </div>
      )}
      <ErrorBanner message={error} />
    </div>
  );
}
