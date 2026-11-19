import { db, Queryable } from '../../database/db';
import { deliveryQueries } from './delivery.query';

export const DELIVERY_STATUSES = ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];
export type ActorType = 'customer' | 'staff' | 'rider' | 'system';

export interface DeliveryRow {
  id: string;
  tracking_code: string;
  customer_id: string;
  rider_id: string | null;
  pickup_address: string;
  delivery_address: string;
  recipient_name: string;
  recipient_phone: string;
  package_description: string;
  package_weight_kg: number | null;
  notes: string | null;
  status: DeliveryStatus;
  assigned_at: Date | null;
  picked_up_at: Date | null;
  delivered_at: Date | null;
  created_at: Date;
  updated_at: Date;
  rider_name?: string | null;
  rider_phone?: string | null;
  customer_name?: string;
  customer_email?: string;
}

export interface HistoryRow {
  from_status: DeliveryStatus | null;
  to_status: DeliveryStatus;
  changed_by_type: ActorType;
  note: string | null;
  created_at: Date;
}

export interface PublicDeliveryRow {
  id: string;
  tracking_code: string;
  status: DeliveryStatus;
  created_at: Date;
  assigned_at: Date | null;
  picked_up_at: Date | null;
  delivered_at: Date | null;
  updated_at: Date;
}

export interface NewDelivery {
  trackingCode: string;
  customerId: string;
  pickupAddress: string;
  deliveryAddress: string;
  recipientName: string;
  recipientPhone: string;
  packageDescription: string;
  packageWeightKg: number | null;
  notes: string | null;
}

export interface Page {
  limit: number;
  offset: number;
}

export interface HistoryEntry {
  deliveryId: string;
  fromStatus: DeliveryStatus | null;
  toStatus: DeliveryStatus;
  changedByType: ActorType;
  changedById: string | null;
  note: string | null;
}

export const deliveryRepository = {
  async insert(input: NewDelivery, q: Queryable): Promise<string> {
    const row = await q.one<{ id: string }>(deliveryQueries.insert, input);
    return row.id;
  },

  async insertHistory(entry: HistoryEntry, q: Queryable): Promise<void> {
    await q.none(deliveryQueries.insertHistory, entry);
  },

  listForCustomer(customerId: string, page: Page): Promise<DeliveryRow[]> {
    return db.any(deliveryQueries.listForCustomer, { customerId, ...page });
  },

  summaryForCustomer(customerId: string): Promise<{ status: DeliveryStatus; count: number }[]> {
    return db.any(deliveryQueries.summaryForCustomer, { customerId });
  },

  findPublicByTrackingCode(trackingCode: string): Promise<PublicDeliveryRow | null> {
    return db.oneOrNone(deliveryQueries.findPublicByTrackingCode, { trackingCode });
  },

  findByIdForCustomer(id: string, customerId: string): Promise<DeliveryRow | null> {
    return db.oneOrNone(deliveryQueries.findByIdForCustomer, { id, customerId });
  },

  listForRider(riderId: string, status: DeliveryStatus | null, page: Page): Promise<DeliveryRow[]> {
    return db.any(deliveryQueries.listForRider, { riderId, status, ...page });
  },

  listAll(status: DeliveryStatus | null, page: Page): Promise<DeliveryRow[]> {
    return db.any(deliveryQueries.listAll, { status, ...page });
  },

  findById(id: string, q: Queryable = db): Promise<DeliveryRow | null> {
    return q.oneOrNone(deliveryQueries.findById, { id });
  },

  lockById(id: string, q: Queryable): Promise<DeliveryRow | null> {
    return q.oneOrNone(deliveryQueries.lockById, { id });
  },

  history(deliveryId: string): Promise<HistoryRow[]> {
    return db.any(deliveryQueries.history, { deliveryId });
  },

  async cancel(id: string, q: Queryable): Promise<void> {
    await q.none(deliveryQueries.cancel, { id });
  },

  async assignRider(id: string, riderId: string, q: Queryable): Promise<void> {
    await q.none(deliveryQueries.assignRider, { id, riderId });
  },

  async updateStatus(id: string, status: DeliveryStatus, q: Queryable): Promise<void> {
    await q.none(deliveryQueries.updateStatus, { id, status });
  },
};
