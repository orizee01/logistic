import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, Delivery } from '../api';
import { ErrorBanner } from '../components/ui';

const EMPTY = {
  pickupAddress: '',
  deliveryAddress: '',
  recipientName: '',
  recipientPhone: '',
  packageDescription: '',
  packageWeightKg: '',
  notes: '',
};

export function NewDeliveryPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (field: keyof typeof EMPTY) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { packageWeightKg, notes, ...rest } = form;
      const delivery = await api<Delivery>('/deliveries', {
        method: 'POST',
        body: {
          ...rest,
          ...(packageWeightKg ? { packageWeightKg: Number(packageWeightKg) } : {}),
          ...(notes.trim() ? { notes } : {}),
        },
      });
      navigate(`/deliveries/${delivery.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create delivery');
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>New delivery</h1>
        <Link to="/deliveries" className="btn btn-ghost">
          Cancel
        </Link>
      </div>

      <form className="card form" onSubmit={handleSubmit}>
        <ErrorBanner message={error} />

        <fieldset>
          <legend>Route</legend>
          <label>
            Pickup address
            <textarea rows={2} value={form.pickupAddress} onChange={update('pickupAddress')} required minLength={5} />
          </label>
          <label>
            Delivery address
            <textarea rows={2} value={form.deliveryAddress} onChange={update('deliveryAddress')} required minLength={5} />
          </label>
        </fieldset>

        <fieldset>
          <legend>Recipient</legend>
          <div className="grid-2">
            <label>
              Name
              <input value={form.recipientName} onChange={update('recipientName')} required minLength={2} />
            </label>
            <label>
              Phone
              <input
                type="tel"
                value={form.recipientPhone}
                onChange={update('recipientPhone')}
                required
                placeholder="+234 801 234 5678"
              />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Package</legend>
          <div className="grid-2">
            <label>
              Description
              <input
                value={form.packageDescription}
                onChange={update('packageDescription')}
                required
                placeholder="e.g. Documents, small box"
              />
            </label>
            <label>
              Weight (kg) <span className="muted">optional</span>
              <input type="number" min="0.01" step="0.01" value={form.packageWeightKg} onChange={update('packageWeightKg')} />
            </label>
          </div>
          <label>
            Notes for the rider <span className="muted">optional</span>
            <textarea rows={2} value={form.notes} onChange={update('notes')} maxLength={1000} />
          </label>
        </fieldset>

        <button className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Booking…' : 'Book delivery'}
        </button>
      </form>
    </>
  );
}
