import { Request, Response } from 'express';
import { IdParams } from '../../middleware/validate';
import { authId } from '../../middleware/auth';
import { deliveryService } from './delivery.service';

export const deliveryController = {
  async create(req: Request, res: Response): Promise<void> {
    res.status(201).json(await deliveryService.create(authId(req), req.body));
  },

  async list(req: Request, res: Response): Promise<void> {
    const { limit, offset } = res.locals.query;
    res.json(await deliveryService.listForCustomer(authId(req), { limit, offset }));
  },

  async summary(req: Request, res: Response): Promise<void> {
    res.json(await deliveryService.summaryForCustomer(authId(req)));
  },

  async track(req: Request<{ trackingCode: string }>, res: Response): Promise<void> {
    res.json(await deliveryService.trackPublic(req.params.trackingCode));
  },

  async getById(req: Request<IdParams>, res: Response): Promise<void> {
    res.json(await deliveryService.getForCustomer(authId(req), req.params.id));
  },

  async cancel(req: Request<IdParams>, res: Response): Promise<void> {
    res.json(await deliveryService.cancelForCustomer(authId(req), req.params.id));
  },
};
