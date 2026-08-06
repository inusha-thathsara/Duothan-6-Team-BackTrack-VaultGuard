import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;

  // Check if hash matches sha256 legacy/seeded format
  const sha256Hash = crypto.createHash("sha256").update(password).digest("hex");
  if (hash === sha256Hash) {
    return true;
  }

  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}


