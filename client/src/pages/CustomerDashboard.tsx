import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Delivery, DeliveryStatus, DeliverySummary } from '../api';
import { useAuth } from '../auth';
import { ErrorBanner, StatusBadge, useLoader } from '../components/ui';

type Filter = 'all' | 'pending' | 'moving' | 'delivered' | 'cancelled';

const MOVING: DeliveryStatus[] = ['assigned', 'picked_up', 'in_transit'];

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'moving', label: 'On the way' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

function matchesFilter(status: DeliveryStatus, filter: Filter): boolean {
  if (filter === 'all') return true;
  if (filter === 'moving') return MOVING.includes(status);
  return status === filter;
}

// Share of the journey completed, for the mini progress bar on each card.
const PROGRESS_PERCENT: Record<DeliveryStatus, number> = {
  pending: 8,
  assigned: 30,
  picked_up: 55,
  in_transit: 80,
  delivered: 100,
  cancelled: 0,
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function relativeDate(value: string): string {
  const date = new Date(value);
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (days < 1 && new Date().getDate() === date.getDate()) return `Today, ${time}`;
  if (days < 2) return `Yesterday, ${time}`;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function CustomerDashboard() {
  const { user } = useAuth();
  const { data: deliveries, error, loading } = useLoader(() => api<Delivery[]>('/deliveries?limit=100'));
  const { data: summary } = useLoader(() => api<DeliverySummary>('/deliveries/summary'));
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const counts: Record<Filter, number> = {
    all: summary?.total ?? 0,
    pending: summary?.pending ?? 0,
    moving: summary?.onTheWay ?? 0,
    delivered: summary?.delivered ?? 0,
    cancelled: summary?.cancelled ?? 0,
  };

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (deliveries ?? []).filter(
      (d) =>
        matchesFilter(d.status, filter) &&
        (!query ||
          [d.trackingCode, d.pickupAddress, d.deliveryAddress, d.recipient.name, d.package.description].some((field) =>
            field.toLowerCase().includes(query),
          )),
    );
  }, [deliveries, filter, search]);

  const firstName = user?.name.split(' ')[0] ?? '';
  const hasAny = (deliveries?.length ?? 0) > 0;

  return (
    <>
      <section className="dash-hero">
        <div>
          <p className="dash-eyebrow">{greeting()}</p>
          <h1>Hi {firstName} 👋</h1>
          <p className="dash-sub">
            {summary && summary.onTheWay > 0
              ? `${summary.onTheWay} ${summary.onTheWay === 1 ? 'parcel is' : 'parcels are'} on the way right now.`
              : 'Book a pickup and follow it all the way to the door.'}
          </p>
        </div>
        <Link to="/deliveries/new" className="btn btn-primary btn-lg">
          <PlusIcon /> New delivery
        </Link>
      </section>

      {summary && summary.total > 0 && (
        <div className="stats">
          <StatCard label="Total deliveries" value={summary.total} tone="total" icon={<BoxIcon />} />
          <StatCard label="Pending" value={summary.pending} tone="pending" icon={<ClockIcon />} />
          <StatCard label="On the way" value={summary.onTheWay} tone="moving" icon={<TruckIcon />} />
          <StatCard label="Delivered" value={summary.delivered} tone="delivered" icon={<CheckIcon />} />
        </div>
      )}

      <ErrorBanner message={error} />

      {hasAny && (
        <div className="dash-toolbar">
          <div className="filter-tabs" role="tablist" aria-label="Filter deliveries">
            {FILTERS.map((option) => (
              <button
                key={option.value}
                role="tab"
                aria-selected={filter === option.value}
                className={`filter-tab ${filter === option.value ? 'active' : ''}`}
                onClick={() => setFilter(option.value)}
              >
                {option.label}
                <span className="filter-count">{counts[option.value]}</span>
              </button>
            ))}
          </div>
          <label className="search-box">
            <SearchIcon />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code, address or recipient"
              aria-label="Search deliveries"
            />
          </label>
        </div>
      )}

      {loading && !deliveries && (
        <div className="delivery-grid" aria-busy="true" aria-label="Loading deliveries">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card delivery-card skeleton-card">
              <div className="skeleton" style={{ width: '40%' }} />
              <div className="skeleton" style={{ width: '85%' }} />
              <div className="skeleton" style={{ width: '70%' }} />
              <div className="skeleton" style={{ width: '55%' }} />
            </div>
          ))}
        </div>
      )}

      {deliveries && !hasAny && (
        <div className="card empty-state">
          <EmptyIllustration />
          <h2>No deliveries yet</h2>
          <p className="muted">Book your first pickup and we'll take it from there. You can track every step.</p>
          <Link to="/deliveries/new" className="btn btn-primary btn-lg">
            <PlusIcon /> Book your first delivery
          </Link>
        </div>
      )}

      {hasAny && visible.length === 0 && (
        <div className="card empty-state compact">
          <p className="muted">No deliveries match {search ? `“${search}”` : 'this filter'}.</p>
          <button
            className="btn btn-ghost"
            onClick={() => {
              setFilter('all');
              setSearch('');
            }}
          >
            Clear filters
          </button>
        </div>
      )}

      <div className="delivery-grid">
        {visible.map((delivery) => (
          <DeliveryCard key={delivery.id} delivery={delivery} />
        ))}
      </div>
    </>
  );
}

function DeliveryCard({ delivery }: { delivery: Delivery }) {
  const percent = PROGRESS_PERCENT[delivery.status];
  return (
    <Link to={`/deliveries/${delivery.id}`} className={`card delivery-card status-${delivery.status}`}>
      <div className="dc-top">
        <span className="tracking">{delivery.trackingCode}</span>
        <StatusBadge status={delivery.status} />
      </div>

      <ol className="dc-route">
        <li>
          <span className="dc-dot pickup" aria-hidden="true" />
          <div>
            <span className="dc-label">Pickup</span>
            <span className="dc-address">{delivery.pickupAddress}</span>
          </div>
        </li>
        <li>
          <span className="dc-dot dropoff" aria-hidden="true">
            <PinIcon />
          </span>
          <div>
            <span className="dc-label">Drop-off</span>
            <span className="dc-address">{delivery.deliveryAddress}</span>
          </div>
        </li>
      </ol>

      {delivery.status !== 'cancelled' && (
        <div className="dc-progress" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Delivery progress">
          <span style={{ width: `${percent}%` }} />
        </div>
      )}

      <div className="dc-meta">
        <span title="Recipient">
          <UserIcon /> {delivery.recipient.name}
        </span>
        <span title="Package">
          <BoxIcon size={15} /> {delivery.package.description}
        </span>
        <span title="Booked">
          <ClockIcon size={15} /> {relativeDate(delivery.createdAt)}
        </span>
      </div>

      {delivery.rider && (
        <div className="dc-rider">
          <span className="avatar" aria-hidden="true">
            {delivery.rider.name
              .split(' ')
              .map((part) => part[0])
              .join('')
              .slice(0, 2)}
          </span>
          <span>
            <strong>{delivery.rider.name}</strong> <span className="muted">is your rider</span>
          </span>
        </div>
      )}
    </Link>
  );
}

function StatCard({ label, value, tone, icon }: { label: string; value: number; tone: string; icon: JSX.Element }) {
  return (
    <div className={`card stat stat-${tone}`}>
      <span className="stat-icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

function EmptyIllustration() {
  return (
    <svg width="160" height="120" viewBox="0 0 160 120" aria-hidden="true" className="empty-illustration">
      <ellipse cx="80" cy="108" rx="58" ry="7" fill="currentColor" opacity="0.08" />
      <path d="M40 46 80 28l40 18v44l-40 18-40-18Z" fill="#f7c873" />
      <path d="M40 46l40 18 40-18" fill="none" stroke="#c98a2e" strokeWidth="3" strokeLinejoin="round" />
      <path d="M80 64v44" stroke="#c98a2e" strokeWidth="3" />
      <path d="M58 37l40 18" stroke="#fff3d6" strokeWidth="6" strokeLinecap="round" />
      <circle cx="126" cy="26" r="13" fill="var(--primary)" />
      <path d="M126 20v12M120 26h12" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

const iconProps = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

function BoxIcon({ size = 20 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
      <path d="m3 8 9 5 9-5M12 13v8" />
    </svg>
  );
}

function ClockIcon({ size = 20 }: { size?: number }) {
  return (
    <svg {...iconProps(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg {...iconProps(20)}>
      <path d="M2 6h11v10H2zM13 10h4l4 4v2h-8" />
      <circle cx="6.5" cy="17.5" r="1.8" />
      <circle cx="17" cy="17.5" r="1.8" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg {...iconProps(20)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg {...iconProps(15)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Zm0-9a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg {...iconProps(16)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg {...iconProps(18)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
