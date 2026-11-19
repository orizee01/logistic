import { Router } from 'express';
import { adminRoutes } from '../modules/admin/admin.routes';
import { authRoutes } from '../modules/auth/auth.routes';
import { customerRoutes } from '../modules/customers/customer.routes';
import { deliveryRoutes } from '../modules/deliveries/delivery.routes';
import { trackingRoutes } from '../modules/deliveries/tracking.routes';
import { riderRoutes } from '../modules/riders/rider.routes';

export const apiRoutes = Router();

apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/customers', customerRoutes);
apiRoutes.use('/deliveries', deliveryRoutes);
apiRoutes.use('/admin', adminRoutes);
apiRoutes.use('/rider', riderRoutes);
apiRoutes.use('/track', trackingRoutes);
