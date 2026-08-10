import bcrypt from "bcryptjs";
import postgres from "postgres";

const connectionString = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;

if (process.env.ENABLE_DEMO_SEED !== "true") {
  console.log("Demo seed skipped. Set ENABLE_DEMO_SEED=true to seed demo users.");
  process.exit(0);
}

if (!connectionString) {
  console.error("POSTGRES_URL or DATABASE_URL is required to seed demo users.");
  process.exit(1);
}

const sql = postgres(connectionString, { ssl: "require", max: 1 });

try {
  const staffHash = await bcrypt.hash("staff123", 12);
  const adminHash = await bcrypt.hash("admin123", 12);
  await sql`
    insert into profiles (first_name, last_name, email, phone, role, staff_id, password_hash, active)
    values ('Sophie', 'Laurent', 'staff@maisonelegance.be', '+32 471 15 81 21', 'staff', 'sophie', ${staffHash}, true)
    on conflict (email) do update set password_hash = excluded.password_hash
  `;
  await sql`
    insert into profiles (first_name, last_name, email, phone, role, staff_id, password_hash, active)
    values ('Admin', 'Manager', 'admin@maisonelegance.be', '+32 2 468 18 55', 'admin', null, ${adminHash}, true)
    on conflict (email) do update set password_hash = excluded.password_hash
  `;
  console.log("Demo users seeded.");
} finally {
  await sql.end();
}
