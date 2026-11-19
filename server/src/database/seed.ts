import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { db, pgp } from './db';

const SEEDS_DIR = path.resolve(__dirname, '../../seeds');
const BCRYPT_ROUNDS = 12;

async function seedAdmin(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME ?? 'Operations Admin';

  if (!email || !password) {
    console.log('SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set; skipping admin seed');
    return;
  }
  if (password.length < 12) {
    throw new Error('SEED_ADMIN_PASSWORD must be at least 12 characters');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await db.none(
    `INSERT INTO staff_users (name, email, password_hash, role)
     VALUES ($<name>, $<email>, $<passwordHash>, 'admin')
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    { name, email, passwordHash },
  );
  console.log(`Seeded admin ${email}`);
}

async function seed(): Promise<void> {
  const files = fs
    .readdirSync(SEEDS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    await db.none(fs.readFileSync(path.join(SEEDS_DIR, file), 'utf8'));
    console.log(`Ran seed ${file}`);
  }

  await seedAdmin();
}

seed()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(() => pgp.end());
