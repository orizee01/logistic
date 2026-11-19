import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { customerController } from './customer.controller';

export const customerRoutes = Router();

customerRoutes.use(authenticate, requireRole('customer'));
customerRoutes.get('/me', customerController.me);
