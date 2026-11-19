import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';

type Source = 'body' | 'params' | 'query';

// Validates req[source] and stores the sanitized value.
// Express 5 makes req.query read-only, so validated query values go to res.locals.query.
export function validate(schema: Joi.ObjectSchema, source: Source = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { value, error } = schema.validate(req[source] ?? {}, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    if (error) {
      throw error;
    }

    if (source === 'query') {
      res.locals.query = value;
    } else {
      req[source] = value;
    }
    next();
  };
}

export const uuidParam = Joi.object({
  id: Joi.string().uuid().required(),
});

export type IdParams = { id: string };
