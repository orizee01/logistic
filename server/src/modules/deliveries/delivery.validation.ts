import Joi from 'joi';
import { DELIVERY_STATUSES } from './delivery.repository';

const phone = Joi.string()
  .trim()
  .pattern(/^\+?[0-9\s-]{7,20}$/)
  .messages({ 'string.pattern.base': 'Phone number must contain 7–20 digits, optionally starting with +' });

export const createDeliverySchema = Joi.object({
  pickupAddress: Joi.string().trim().min(5).max(500).required(),
  deliveryAddress: Joi.string().trim().min(5).max(500).required(),
  recipientName: Joi.string().trim().min(2).max(150).required(),
  recipientPhone: phone.required(),
  packageDescription: Joi.string().trim().min(2).max(500).required(),
  packageWeightKg: Joi.number().positive().max(10000).precision(2),
  notes: Joi.string().trim().max(1000).allow(''),
});

export const paginationSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
  status: Joi.string().valid(...DELIVERY_STATUSES),
});

export const trackingCodeParam = Joi.object({
  trackingCode: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^LG-[A-Z0-9]{10}$/)
    .required()
    .messages({ 'string.pattern.base': 'Tracking codes look like LG-7KQ2M9XHPT' }),
});

export const assignRiderSchema = Joi.object({
  riderId: Joi.string().uuid().required(),
});

export const riderStatusSchema = Joi.object({
  status: Joi.string().valid('picked_up', 'in_transit', 'delivered').required(),
  note: Joi.string().trim().max(500).allow(''),
});
