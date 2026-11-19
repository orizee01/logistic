import { Router } from 'express';
import Joi from 'joi';
import { authenticate, requireRole } from '../../middleware/auth';
import { uuidParam, validate } from '../../middleware/validate';
import { paginationSchema, riderStatusSchema } from '../deliveries/delivery.validation';
import { riderController } from './rider.controller';

const availabilitySchema = Joi.object({ isAvailable: Joi.boolean().required() });

export const riderRoutes = Router();

riderRoutes.use(authenticate, requireRole('rider'));
riderRoutes.get('/me', riderController.me);
riderRoutes.patch('/me/availability', validate(availabilitySchema), riderController.setAvailability);
riderRoutes.get('/deliveries', validate(paginationSchema, 'query'), riderController.listDeliveries);
riderRoutes.patch(
  '/deliveries/:id/status',
  validate(uuidParam, 'params'),
  validate(riderStatusSchema),
  riderController.updateStatus,
);
