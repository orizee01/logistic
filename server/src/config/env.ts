import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const jwtSecret = required('JWT_SECRET');
if (jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long');
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',
  activationTokenTtlMinutes: 60,
  authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 20),
  // Development convenience only: return activation links in the API response. Never enabled in production.
  showDevActivationLinks: process.env.DEV_SHOW_ACTIVATION_LINKS === 'true' && process.env.NODE_ENV !== 'production',
  // Time zone used for times shown in emails, e.g. Africa/Lagos.
  mailTimeZone: process.env.MAIL_TIMEZONE || 'UTC',
  smtp: {
    host: process.env.SMTP_HOST || null,
    port: Number(process.env.SMTP_PORT ?? 587),
    // true for port 465 (implicit TLS); false for 587, which upgrades with STARTTLS.
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || undefined,
    pass: process.env.SMTP_PASS || undefined,
    from: process.env.MAIL_FROM || 'SwiftDrop <no-reply@localhost>',
  },
};
