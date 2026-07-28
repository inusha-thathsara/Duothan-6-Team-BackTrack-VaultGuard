import bcrypt from 'bcryptjs';

const DEFAULT_ROUNDS = 12;

function getRounds(): number {
  const envRounds = process.env.BCRYPT_ROUNDS;
  if (!envRounds) return DEFAULT_ROUNDS;
  const parsed = parseInt(envRounds, 10);
  return isNaN(parsed) ? DEFAULT_ROUNDS : parsed;
}

/**
 * Hashes a plaintext password using bcrypt with configurable work factor.
 */
export async function hashPassword(password: string): Promise<string> {
  const rounds = getRounds();
  return bcrypt.hash(password, rounds);
}

/**
 * Compares a plaintext password against a stored bcrypt hash in a timing-safe manner.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}
