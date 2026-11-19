import crypto from 'crypto';
import { db } from '../../database/db';
import { BadRequestError, ConflictError, NotFoundError } from '../../utils/errors';
import { riderRepository } from '../riders/rider.repository';
import {
  DELIVERY_STATUSES,
  DeliveryRow,
  DeliveryStatus,
  HistoryRow,
  Page,
  deliveryRepository,
} from './delivery.repository';

// Statuses a rider may move a delivery to, keyed by its current status.
const RIDER_TRANSITIONS: Partial<Record<DeliveryStatus, DeliveryStatus[]>> = {
  assigned: ['picked_up'],
  picked_up: ['in_transit', 'delivered'],
  in_transit: ['delivered'],
};

// A rider can be (re)assigned until the package has been picked up.
const ASSIGNABLE_STATUSES: DeliveryStatus[] = ['pending', 'assigned'];

const TRACKING_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateTrackingCode(): string {
  let code = '';
  for (let i = 0; i < 10; i++) {
    code += TRACKING_ALPHABET[crypto.randomInt(TRACKING_ALPHABET.length)];
  }
  return `LG-${code}`;
}

export interface CreateDeliveryInput {
  pickupAddress: string;
  deliveryAddress: string;
  recipientName: string;
  recipientPhone: string;
  packageDescription: string;
  packageWeightKg?: number;
  notes?: string;
}

type View = 'customer' | 'staff' | 'rider';

function toDto(row: DeliveryRow, view: View) {
  return {
    id: row.id,
    trackingCode: row.tracking_code,
    status: row.status,
    pickupAddress: row.pickup_address,
    deliveryAddress: row.delivery_address,
    recipient: { name: row.recipient_name, phone: row.recipient_phone },
    package: { description: row.package_description, weightKg: row.package_weight_kg },
    notes: row.notes,
    rider: row.rider_id ? { id: row.rider_id, name: row.rider_name, phone: row.rider_phone } : null,
    ...(view !== 'customer'
      ? { customer: { id: row.customer_id, name: row.customer_name, email: row.customer_email } }
      : {}),
    assignedAt: row.assigned_at,
    pickedUpAt: row.picked_up_at,
    deliveredAt: row.delivered_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function historyDto(rows: HistoryRow[]) {
  return rows.map((row) => ({
    fromStatus: row.from_status,
    toStatus: row.to_status,
    changedBy: row.changed_by_type,
    note: row.note,
    at: row.created_at,
  }));
}

async function withHistory(row: DeliveryRow, view: View) {
  return { ...toDto(row, view), history: historyDto(await deliveryRepository.history(row.id)) };
}

export const deliveryService = {
  // ── Customer ─────────────────────────────────────────────────────────────

  async create(customerId: string, input: CreateDeliveryInput) {
    const id = await db.tx(async (t) => {
      const deliveryId = await deliveryRepository.insert(
        {
          trackingCode: generateTrackingCode(),
          customerId,
          pickupAddress: input.pickupAddress,
          deliveryAddress: input.deliveryAddress,
          recipientName: input.recipientName,
          recipientPhone: input.recipientPhone,
          packageDescription: input.packageDescription,
          packageWeightKg: input.packageWeightKg ?? null,
          notes: input.notes ?? null,
        },
        t,
      );
      await deliveryRepository.insertHistory(
        {
          deliveryId,
          fromStatus: null,
          toStatus: 'pending',
          changedByType: 'customer',
          changedById: customerId,
          note: 'Delivery request created',
        },
        t,
      );
      return deliveryId;
    });

    return this.getForCustomer(customerId, id);
  },

  async listForCustomer(customerId: string, page: Page) {
    const rows = await deliveryRepository.listForCustomer(customerId, page);
    return rows.map((row) => toDto(row, 'customer'));
  },

  async summaryForCustomer(customerId: string) {
    const counts = Object.fromEntries(DELIVERY_STATUSES.map((status) => [status, 0])) as Record<DeliveryStatus, number>;
    for (const row of await deliveryRepository.summaryForCustomer(customerId)) {
      counts[row.status] = row.count;
    }
    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    return {
      total,
      pending: counts.pending,
      onTheWay: counts.assigned + counts.picked_up + counts.in_transit,
      delivered: counts.delivered,
      cancelled: counts.cancelled,
    };
  },

  // ── Public ───────────────────────────────────────────────────────────────

  // Anyone with the tracking code may see progress, but nothing that identifies people or places.
  async trackPublic(trackingCode: string) {
    const row = await deliveryRepository.findPublicByTrackingCode(trackingCode);
    if (!row) throw new NotFoundError('No delivery found with that tracking code');
    const history = await deliveryRepository.history(row.id);
    return {
      trackingCode: row.tracking_code,
      status: row.status,
      createdAt: row.created_at,
      assignedAt: row.assigned_at,
      pickedUpAt: row.picked_up_at,
      deliveredAt: row.delivered_at,
      updatedAt: row.updated_at,
      history: history.map((entry) => ({ status: entry.to_status, at: entry.created_at })),
    };
  },

  async getForCustomer(customerId: string, deliveryId: string) {
    const row = await deliveryRepository.findByIdForCustomer(deliveryId, customerId);
    // 404 rather than 403 so customers cannot probe for other customers' delivery IDs.
    if (!row) throw new NotFoundError('Delivery not found');
    return withHistory(row, 'customer');
  },

  async cancelForCustomer(customerId: string, deliveryId: string) {
    await db.tx(async (t) => {
      const delivery = await deliveryRepository.lockById(deliveryId, t);
      if (!delivery || delivery.customer_id !== customerId) {
        throw new NotFoundError('Delivery not found');
      }
      if (delivery.status !== 'pending') {
        throw new ConflictError('Only pending deliveries can be cancelled');
      }

      await deliveryRepository.cancel(deliveryId, t);
      await deliveryRepository.insertHistory(
        {
          deliveryId,
          fromStatus: delivery.status,
          toStatus: 'cancelled',
          changedByType: 'customer',
          changedById: customerId,
          note: 'Cancelled by customer',
        },
        t,
      );
    });

    return this.getForCustomer(customerId, deliveryId);
  },

  // ── Admin / dispatcher ───────────────────────────────────────────────────

  async listAll(status: DeliveryStatus | null, page: Page) {
    const rows = await deliveryRepository.listAll(status, page);
    return rows.map((row) => toDto(row, 'staff'));
  },

  async getForStaff(deliveryId: string) {
    const row = await deliveryRepository.findById(deliveryId);
    if (!row) throw new NotFoundError('Delivery not found');
    return withHistory(row, 'staff');
  },

  async assignRider(staffId: string, deliveryId: string, riderId: string) {
    await db.tx(async (t) => {
      const delivery = await deliveryRepository.lockById(deliveryId, t);
      if (!delivery) throw new NotFoundError('Delivery not found');
      if (!ASSIGNABLE_STATUSES.includes(delivery.status)) {
        throw new ConflictError(`Cannot assign a rider to a delivery that is ${delivery.status}`);
      }
      if (delivery.rider_id === riderId) {
        throw new ConflictError('This rider is already assigned to the delivery');
      }

      const rider = await riderRepository.lockById(riderId, t);
      if (!rider || !rider.is_active) throw new BadRequestError('Rider not found');
      if (!rider.is_activated) throw new BadRequestError('Rider has not activated their account yet');
      if (!rider.is_available) throw new ConflictError('Rider is not available');

      await deliveryRepository.assignRider(deliveryId, riderId, t);
      await deliveryRepository.insertHistory(
        {
          deliveryId,
          fromStatus: delivery.status,
          toStatus: 'assigned',
          changedByType: 'staff',
          changedById: staffId,
          note: delivery.rider_id ? `Reassigned to ${rider.name}` : `Assigned to ${rider.name}`,
        },
        t,
      );
    });

    return this.getForStaff(deliveryId);
  },

  // ── Rider ────────────────────────────────────────────────────────────────

  async listForRider(riderId: string, status: DeliveryStatus | null, page: Page) {
    const rows = await deliveryRepository.listForRider(riderId, status, page);
    return rows.map((row) => toDto(row, 'rider'));
  },

  async updateStatusByRider(riderId: string, deliveryId: string, status: DeliveryStatus, note?: string) {
    await db.tx(async (t) => {
      const delivery = await deliveryRepository.lockById(deliveryId, t);
      // Riders can only touch deliveries currently assigned to them.
      if (!delivery || delivery.rider_id !== riderId) {
        throw new NotFoundError('Delivery not found');
      }

      const allowed = RIDER_TRANSITIONS[delivery.status] ?? [];
      if (!allowed.includes(status)) {
        throw new ConflictError(`Cannot change status from ${delivery.status} to ${status}`);
      }

      await deliveryRepository.updateStatus(deliveryId, status, t);
      await deliveryRepository.insertHistory(
        {
          deliveryId,
          fromStatus: delivery.status,
          toStatus: status,
          changedByType: 'rider',
          changedById: riderId,
          note: note ?? null,
        },
        t,
      );
    });

    const row = await deliveryRepository.findById(deliveryId);
    return withHistory(row!, 'rider');
  },
};
