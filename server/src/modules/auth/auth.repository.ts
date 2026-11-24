import { db, Queryable } from '../../database/db';

export type AccountType = 'customer' | 'rider' | 'staff';
export type ActivatableAccountType = Exclude<AccountType, 'staff'>;

export interface AccountRow {
  id: string;
  name: string;
  email: string;
  password_hash: string | null;
  is_active: boolean;
  role?: 'admin' | 'dispatcher';
}

export interface ActivationTokenRow {
  id: string;
  account_type: ActivatableAccountType;
  account_id: string;
  expires_at: Date;
  used_at: Date | null;
}

// Whitelisted table names — never interpolate user input into SQL identifiers.
const TABLES: Record<AccountType, string> = {
  customer: 'customers',
  rider: 'riders',
  staff: 'staff_users',
};

export const authRepository = {
  findAccountByEmail(type: AccountType, email: string, q: Queryable = db): Promise<AccountRow | null> {
    const roleColumn = type === 'staff' ? ', role' : '';
    return q.oneOrNone(
      `SELECT id, name, email, password_hash, is_active${roleColumn}
       FROM ${TABLES[type]}
       WHERE email = $<email>`,
      { email },
    );
  },

  async replaceActivationToken(
    type: ActivatableAccountType,
    accountId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await db.tx(async (t) => {
      // Only the most recently issued link stays valid.
      await t.none(
        `DELETE FROM account_activation_tokens
         WHERE account_type = $<type> AND account_id = $<accountId> AND used_at IS NULL`,
        { type, accountId },
      );
      await t.none(
        `INSERT INTO account_activation_tokens (account_type, account_id, token_hash, expires_at)
         VALUES ($<type>, $<accountId>, $<tokenHash>, $<expiresAt>)`,
        { type, accountId, tokenHash, expiresAt },
      );
    });
  },

  findActivationTokenForUpdate(tokenHash: string, q: Queryable): Promise<ActivationTokenRow | null> {
    return q.oneOrNone(
      `SELECT id, account_type, account_id, expires_at, used_at
       FROM account_activation_tokens
       WHERE token_hash = $<tokenHash>
       FOR UPDATE`,
      { tokenHash },
    );
  },

  async markActivationTokenUsed(id: string, q: Queryable): Promise<void> {
    await q.none('UPDATE account_activation_tokens SET used_at = NOW() WHERE id = $<id>', { id });
  },

  // Returns the account's name and email, or null if it no longer exists or has been deactivated.
  setPassword(
    type: ActivatableAccountType,
    accountId: string,
    passwordHash: string,
    q: Queryable,
  ): Promise<{ name: string; email: string } | null> {
    return q.oneOrNone(
      `UPDATE ${TABLES[type]} SET password_hash = $<passwordHash>
       WHERE id = $<accountId> AND is_active = TRUE
       RETURNING name, email`,
      { passwordHash, accountId },
    );
  },
};
