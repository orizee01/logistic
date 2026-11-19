import { db } from '../../database/db';
import { customerQueries } from './customer.query';

export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: Date;
}

export const customerRepository = {
  findById(id: string): Promise<CustomerRow | null> {
    return db.oneOrNone(customerQueries.findById, { id });
  },
};
