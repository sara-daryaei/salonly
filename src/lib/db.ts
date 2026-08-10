import postgres from "postgres";

const connectionString = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;

export const sql = connectionString ? postgres(connectionString, { ssl: "require", max: 3 }) : null;

export function hasDatabase() {
  return Boolean(sql);
}

export function requireDatabase() {
  if (!sql) throw new Error("Database is not configured.");
  return sql;
}
