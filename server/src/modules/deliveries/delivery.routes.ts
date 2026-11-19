import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { uuidParam, validate } from '../../middleware/validate';
import { deliveryController } from './delivery.controller';
import { createDeliverySchema, paginationSchema } from './delivery.validation';

export const deliveryRoutes = Router();

deliveryRoutes.use(authenticate, requireRole('customer'));
deliveryRoutes.post('/', validate(createDeliverySchema), deliveryController.create);
deliveryRoutes.get('/', validate(paginationSchema, 'query'), deliveryController.list);
deliveryRoutes.get('/summary', deliveryController.summary);
deliveryRoutes.get('/:id', validate(uuidParam, 'params'), deliveryController.getById);
deliveryRoutes.patch('/:id/cancel', validate(uuidParam, 'params'), deliveryController.cancel);
