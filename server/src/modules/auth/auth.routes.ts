import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env';
import { validate } from '../../middleware/validate';
import { authController } from './auth.controller';
import { activationCompleteSchema, activationRequestSchema, loginSchema } from './auth.validation';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.authRateLimitMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts, please try again later' } },
});

export const authRoutes = Router();

authRoutes.use(authLimiter);
authRoutes.post('/login', validate(loginSchema), authController.customerLogin);
authRoutes.post('/rider/login', validate(loginSchema), authController.riderLogin);
authRoutes.post('/staff/login', validate(loginSchema), authController.staffLogin);
authRoutes.post('/activation/request', validate(activationRequestSchema), authController.requestActivation);
authRoutes.post('/activation/complete', validate(activationCompleteSchema), authController.completeActivation);
