import { NextFunction, Request, Response } from 'express';
import { AuthPayload, Role, verifyToken } from '../utils/jwt';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing bearer token');
  }

  try {
    req.auth = verifyToken(header.slice('Bearer '.length));
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      throw new UnauthorizedError();
    }
    if (!roles.includes(req.auth.role)) {
      throw new ForbiddenError('You do not have access to this resource');
    }
    next();
  };
}

// The authenticated user's ID, always taken from the verified JWT — never from the request body or query.
export function authId(req: Request): string {
  if (!req.auth) {
    throw new UnauthorizedError();
  }
  return req.auth.sub;
}
