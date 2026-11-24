import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';
import { activationEmail, passwordSetEmail, signInNotificationEmail } from './emailTemplates';

// Sends mail over SMTP when SMTP_HOST is configured (Gmail, Resend, Brevo, Mailgun, ...).
// Without it — or when SMTP_USER is set but SMTP_PASS is missing, which every provider would
// reject — messages are printed to the console so local development still works.
const missingPassword = Boolean(env.smtp.host && env.smtp.user && !env.smtp.pass);

const transporter: Transporter | null = env.smtp.host && !missingPassword
  ? nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    })
  : null;

// True when emails actually leave the server (not just printed to the console).
export function isEmailDeliveryEnabled(): boolean {
  return transporter !== null;
}

export async function verifyMailer(): Promise<void> {
  if (missingPassword) {
    console.log(`Mailer: console mode (add SMTP_PASS in server/.env to send via ${env.smtp.host})`);
    return;
  }
  if (!transporter) {
    console.log('Mailer: SMTP_HOST not set; emails will be printed to the console');
    return;
  }
  try {
    await transporter.verify();
    console.log(`Mailer: connected to ${env.smtp.host}:${env.smtp.port}`);
  } catch (error) {
    console.error(`Mailer: cannot connect to ${env.smtp.host}:${env.smtp.port} —`, (error as Error).message);
  }
}

interface Email {
  to: string;
  subject: string;
  text: string;
  html: string;
  // Short label for logs, e.g. "activation".
  kind: string;
  // Printed instead of the full body when no SMTP server is configured.
  consoleSummary: string[];
}

// Never throws: email problems are logged so they can't break the request that triggered them.
async function send(email: Email): Promise<void> {
  if (!transporter) {
    const line = '─'.repeat(34);
    console.log(['', `──────── ${email.kind} email ────────`, `To:   ${email.to}`, ...email.consoleSummary, line, ''].join('\n'));
    return;
  }

  try {
    await transporter.sendMail({ from: env.smtp.from, to: email.to, subject: email.subject, text: email.text, html: email.html });
    console.log(`Mailer: ${email.kind} email sent to ${email.to}`);
  } catch (error) {
    console.error(`Mailer: failed to send ${email.kind} email to ${email.to} —`, (error as Error).message);
  }
}

export async function sendActivationEmail(to: string, name: string, link: string): Promise<void> {
  const email = activationEmail({ name, email: to, link, expiresInMinutes: env.activationTokenTtlMinutes });
  await send({ to, kind: 'activation', consoleSummary: [`Link: ${link}`], ...email });
}

export async function sendPasswordSetEmail(to: string, name: string): Promise<void> {
  const when = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: env.mailTimeZone,
    timeZoneName: 'short',
  }).format(new Date());
  const email = passwordSetEmail({ name, email: to, when, resetUrl: `${env.clientUrl}/activate` });
  await send({ to, kind: 'password set', consoleSummary: [`When: ${when}`], ...email });
}

export interface LoginContext {
  at: Date;
  ip: string | null;
  userAgent: string | null;
}

// Rough "Chrome on macOS" style label; good enough for a security notice.
export function describeDevice(userAgent: string | null): string {
  if (!userAgent) return 'Unknown device';
  const browser =
    /Edg\//.test(userAgent) ? 'Edge'
    : /OPR\/|Opera/.test(userAgent) ? 'Opera'
    : /Firefox\//.test(userAgent) ? 'Firefox'
    : /Chrome\//.test(userAgent) ? 'Chrome'
    : /Safari\//.test(userAgent) ? 'Safari'
    : /PostmanRuntime/.test(userAgent) ? 'Postman'
    : /curl\//.test(userAgent) ? 'curl'
    : 'Unknown browser';
  const os =
    /iPhone|iPad/.test(userAgent) ? 'iOS'
    : /Android/.test(userAgent) ? 'Android'
    : /Mac OS X|Macintosh/.test(userAgent) ? 'macOS'
    : /Windows/.test(userAgent) ? 'Windows'
    : /Linux/.test(userAgent) ? 'Linux'
    : null;
  return os ? `${browser} on ${os}` : browser;
}

export async function sendLoginNotificationEmail(to: string, name: string, context: LoginContext): Promise<void> {
  const when = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: env.mailTimeZone,
    timeZoneName: 'short',
  }).format(context.at);
  const device = describeDevice(context.userAgent);
  const ip = context.ip ?? 'Unknown';
  const secureAccountUrl = `${env.clientUrl}/activate?type=customer`;

  const email = signInNotificationEmail({ name, email: to, when, device, ip, secureAccountUrl });
  await send({
    to,
    kind: 'sign-in notification',
    consoleSummary: [`When: ${when}`, `Device: ${device}`, `IP: ${ip}`],
    ...email,
  });
}
