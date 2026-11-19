import Joi from 'joi';

const email = Joi.string().trim().lowercase().email().max(255).required();

export const loginSchema = Joi.object({
  email,
  password: Joi.string().min(1).max(200).required(),
});

export const activationRequestSchema = Joi.object({
  email,
  accountType: Joi.string().valid('customer', 'rider').default('customer'),
});

export const activationCompleteSchema = Joi.object({
  token: Joi.string().max(200).required(),
  password: Joi.string()
    .min(10)
    .max(200)
    .pattern(/[A-Za-z]/, 'letter')
    .pattern(/\d/, 'number')
    .required()
    .messages({
      'string.min': 'Password must be at least 10 characters',
      'string.pattern.name': 'Password must contain at least one {#name}',
    }),
});
