import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export type Role = 'customer' | 'rider' | 'admin' | 'dispatcher';

export interface AuthPayload {
  sub: string;
  role: Role;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): AuthPayload {
  const decoded = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
  if (typeof decoded === 'string' || typeof decoded.sub !== 'string' || typeof decoded.role !== 'string') {
    throw new Error('Malformed token payload');
  }
  return { sub: decoded.sub, role: decoded.role as Role };
}
