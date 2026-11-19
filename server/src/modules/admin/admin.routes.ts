import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { uuidParam, validate } from '../../middleware/validate';
import { assignRiderSchema, paginationSchema } from '../deliveries/delivery.validation';
import { adminController } from './admin.controller';

export const adminRoutes = Router();

adminRoutes.use(authenticate, requireRole('admin', 'dispatcher'));
adminRoutes.get('/deliveries', validate(paginationSchema, 'query'), adminController.listDeliveries);
adminRoutes.get('/deliveries/:id', validate(uuidParam, 'params'), adminController.getDelivery);
adminRoutes.patch(
  '/deliveries/:id/assign',
  validate(uuidParam, 'params'),
  validate(assignRiderSchema),
  adminController.assignRider,
);
adminRoutes.get('/riders', adminController.listRiders);
