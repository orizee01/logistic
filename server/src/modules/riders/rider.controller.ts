import { Request, Response } from 'express';
import { IdParams } from '../../middleware/validate';
import { authId } from '../../middleware/auth';
import { NotFoundError } from '../../utils/errors';
import { deliveryService } from '../deliveries/delivery.service';
import { riderRepository } from './rider.repository';

export const riderController = {
  async me(req: Request, res: Response): Promise<void> {
    const rider = await riderRepository.findById(authId(req));
    if (!rider || !rider.is_active) throw new NotFoundError('Rider not found');
    res.json({
      id: rider.id,
      name: rider.name,
      email: rider.email,
      phone: rider.phone,
      isAvailable: rider.is_available,
      activeDeliveries: rider.active_deliveries,
    });
  },

  async setAvailability(req: Request, res: Response): Promise<void> {
    await riderRepository.setAvailability(authId(req), req.body.isAvailable);
    await riderController.me(req, res);
  },

  async listDeliveries(req: Request, res: Response): Promise<void> {
    const { status, limit, offset } = res.locals.query;
    res.json(await deliveryService.listForRider(authId(req), status ?? null, { limit, offset }));
  },

  async updateStatus(req: Request<IdParams>, res: Response): Promise<void> {
    const { status, note } = req.body;
    res.json(await deliveryService.updateStatusByRider(authId(req), req.params.id, status, note || undefined));
  },
};
