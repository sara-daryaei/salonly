import bcrypt from "bcryptjs";

const bcryptCost = 12;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, bcryptCost);
}

export async function verifyPassword(password: string, passwordHash: string) {
  if (!passwordHash.startsWith("$2a$") && !passwordHash.startsWith("$2b$") && !passwordHash.startsWith("$2y$")) {
    return false;
  }
  return bcrypt.compare(password, passwordHash);
}
