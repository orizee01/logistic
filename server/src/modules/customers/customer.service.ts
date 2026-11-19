import { NotFoundError } from '../../utils/errors';
import { customerRepository } from './customer.repository';

export const customerService = {
  async getProfile(customerId: string) {
    const customer = await customerRepository.findById(customerId);
    if (!customer || !customer.is_active) {
      throw new NotFoundError('Customer not found');
    }

    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      createdAt: customer.created_at,
    };
  },
};
