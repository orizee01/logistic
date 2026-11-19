import { Request, Response } from 'express';
import { IdParams } from '../../middleware/validate';
import { authId } from '../../middleware/auth';
import { deliveryService } from '../deliveries/delivery.service';
import { riderRepository } from '../riders/rider.repository';

export const adminController = {
  async listDeliveries(_req: Request, res: Response): Promise<void> {
    const { status, limit, offset } = res.locals.query;
    res.json(await deliveryService.listAll(status ?? null, { limit, offset }));
  },

  async getDelivery(req: Request<IdParams>, res: Response): Promise<void> {
    res.json(await deliveryService.getForStaff(req.params.id));
  },

  async listRiders(_req: Request, res: Response): Promise<void> {
    const riders = await riderRepository.listActive();
    res.json(
      riders.map((rider) => ({
        id: rider.id,
        name: rider.name,
        email: rider.email,
        phone: rider.phone,
        isAvailable: rider.is_available,
        isActivated: rider.is_activated,
        activeDeliveries: rider.active_deliveries,
      })),
    );
  },

  async assignRider(req: Request<IdParams>, res: Response): Promise<void> {
    res.json(await deliveryService.assignRider(authId(req), req.params.id, req.body.riderId));
  },
};
