import { db, Queryable } from '../../database/db';

export interface RiderRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  is_available: boolean;
  is_active: boolean;
  is_activated: boolean;
  active_deliveries: number;
}

const SELECT_RIDER = `
  SELECT r.id, r.name, r.email, r.phone, r.is_available, r.is_active,
         (r.password_hash IS NOT NULL) AS is_activated,
         (SELECT COUNT(*)::int FROM deliveries d
          WHERE d.rider_id = r.id AND d.status IN ('assigned', 'picked_up', 'in_transit')) AS active_deliveries
  FROM riders r
`;

export const riderRepository = {
  findById(id: string, q: Queryable = db): Promise<RiderRow | null> {
    return q.oneOrNone(`${SELECT_RIDER} WHERE r.id = $<id>`, { id });
  },

  lockById(id: string, q: Queryable): Promise<Omit<RiderRow, 'active_deliveries'> | null> {
    return q.oneOrNone(
      `SELECT id, name, email, phone, is_available, is_active, (password_hash IS NOT NULL) AS is_activated
       FROM riders WHERE id = $<id> FOR UPDATE`,
      { id },
    );
  },

  listActive(): Promise<RiderRow[]> {
    return db.any(`${SELECT_RIDER} WHERE r.is_active = TRUE ORDER BY r.is_available DESC, r.name ASC`);
  },

  async setAvailability(id: string, isAvailable: boolean): Promise<void> {
    await db.none('UPDATE riders SET is_available = $<isAvailable> WHERE id = $<id>', { id, isAvailable });
  },
};
