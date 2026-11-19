import pgPromise, { IBaseProtocol } from 'pg-promise';
import { env } from '../config/env';

export const pgp = pgPromise();

// Return NUMERIC columns (e.g. package_weight_kg) as numbers instead of strings.
pgp.pg.types.setTypeParser(1700, (value: string) => parseFloat(value));

export const db = pgp({
  connectionString: env.databaseUrl,
  ssl: env.isProduction ? { rejectUnauthorized: false } : undefined,
});

// Either the root database object or a task/transaction context.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type Queryable = IBaseProtocol<{}>;
