import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../../middleware/validate';
import { deliveryController } from './delivery.controller';
import { trackingCodeParam } from './delivery.validation';

// Public, unauthenticated parcel tracking. Rate-limited so codes can't be brute-forced.
const trackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many tracking lookups, please try again later' } },
});

export const trackingRoutes = Router();

trackingRoutes.get('/:trackingCode', trackLimiter, validate(trackingCodeParam, 'params'), deliveryController.track);
