import { requireDatabase } from "@/lib/db";

const maxFailures = 5;
const windowMinutes = 15;
const cooldownMinutes = 15;

export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

export async function checkLoginRateLimit(key: string) {
  const db = requireDatabase();
  const windowInterval = `${windowMinutes} minutes`;
  const rows = await db`
    select count(*)::int as failures
    from login_attempts
    where key = ${key}
      and success = false
      and attempted_at > now() - ${windowInterval}::interval
  `;
  return Number(rows[0]?.failures ?? 0) < maxFailures;
}

export async function recordLoginAttempt(input: { key: string; ip: string; email: string; success: boolean; profileId?: string | null }) {
  const db = requireDatabase();
  const cooldownInterval = `${cooldownMinutes} minutes`;
  await db`
    insert into login_attempts (key, ip, email, success, profile_id, cooldown_until)
    values (
      ${input.key},
      ${input.ip},
      ${input.email},
      ${input.success},
      ${input.profileId ?? null},
      case when ${input.success} then null else now() + ${cooldownInterval}::interval end
    )
  `;
}
