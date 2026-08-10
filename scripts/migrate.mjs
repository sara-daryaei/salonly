import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";

const connectionString = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error("POSTGRES_URL or DATABASE_URL is required to run migrations.");
  process.exit(1);
}

const sql = postgres(connectionString, { ssl: "require", max: 1 });
const migrationsDir = join(process.cwd(), "database", "migrations");

try {
  await sql`create table if not exists schema_migrations (id text primary key, applied_at timestamptz not null default now())`;
  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    const existing = await sql`select id from schema_migrations where id = ${file}`;
    if (existing[0]) {
      console.log(`Skipping ${file}`);
      continue;
    }
    const statement = await readFile(join(migrationsDir, file), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(statement);
      await tx`insert into schema_migrations (id) values (${file})`;
    });
    console.log(`Applied ${file}`);
  }
} finally {
  await sql.end();
}
