import { Request, Response } from 'express';
import { authId } from '../../middleware/auth';
import { customerService } from './customer.service';

export const customerController = {
  async me(req: Request, res: Response): Promise<void> {
    res.json(await customerService.getProfile(authId(req)));
  },
};
