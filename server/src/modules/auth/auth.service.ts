import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from '../../database/db';
import { env } from '../../config/env';
import { BadRequestError, UnauthorizedError } from '../../utils/errors';
import { Role, signToken } from '../../utils/jwt';
import { LoginContext, sendActivationEmail, sendLoginNotificationEmail, sendPasswordSetEmail } from '../../utils/mailer';
import { AccountType, ActivatableAccountType, authRepository } from './auth.repository';

const BCRYPT_ROUNDS = 12;

// Compared against when no account/password exists, so a login for an unknown
// email takes as long as one for a real account (prevents user enumeration by timing).
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), BCRYPT_ROUNDS);

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export interface LoginResult {
  token: string;
  user: { id: string; name: string; email: string; role: Role };
}

export const authService = {
  async login(type: AccountType, email: string, password: string, context: LoginContext): Promise<LoginResult> {
    const account = await authRepository.findAccountByEmail(type, email);

    const passwordIsValid = await bcrypt.compare(password, account?.password_hash ?? DUMMY_HASH);

    // Same error for every failure mode: unknown email, not yet activated, wrong password, deactivated.
    if (!account || !account.password_hash || !passwordIsValid || !account.is_active) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const role: Role = type === 'staff' ? account.role! : type;

    // Security notice to the customer. Awaited because serverless hosts (Vercel) can freeze the function as soon
    // as the response is sent, which would silently drop a background send. The mailer never throws.
    if (type === 'customer') {
      await sendLoginNotificationEmail(account.email, account.name, context).catch((error) =>
        console.error('Mailer: could not prepare sign-in notification —', error),
      );
    }

    return {
      token: signToken({ sub: account.id, role }),
      user: { id: account.id, name: account.name, email: account.email, role },
    };
  },

  // Resolves the same way whether or not the email exists. Returns the link so development
  // builds can show it on screen; callers must not expose it in production.
  async requestActivation(type: ActivatableAccountType, email: string): Promise<string | null> {
    const account = await authRepository.findAccountByEmail(type, email);
    if (!account || !account.is_active) {
      return null;
    }

    const token = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + env.activationTokenTtlMinutes * 60_000);
    await authRepository.replaceActivationToken(type, account.id, hashToken(token), expiresAt);

    const link = `${env.clientUrl}/activate?token=${encodeURIComponent(token)}`;
    await sendActivationEmail(account.email, account.name, link);
    return link;
  },

  // Returns the account type so the client can send the user to the right sign-in page.
  async completeActivation(token: string, password: string): Promise<ActivatableAccountType> {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const { accountType, account } = await db.tx(async (t) => {
      const record = await authRepository.findActivationTokenForUpdate(hashToken(token), t);
      if (!record || record.used_at || record.expires_at.getTime() < Date.now()) {
        throw new BadRequestError('This activation link is invalid or has expired');
      }

      const updated = await authRepository.setPassword(record.account_type, record.account_id, passwordHash, t);
      if (!updated) {
        throw new BadRequestError('This activation link is invalid or has expired');
      }
      await authRepository.markActivationTokenUsed(record.id, t);
      return { accountType: record.account_type, account: updated };
    });

    // Confirmation to the account owner. Awaited so a serverless host can't freeze the function before it sends.
    await sendPasswordSetEmail(account.email, account.name).catch((error) =>
      console.error('Mailer: could not prepare password confirmation —', error),
    );

    return accountType;
  },
};
