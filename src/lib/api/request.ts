import { headers } from "next/headers";
import { ApiError } from "@/lib/api/errors";
import { rateLimit } from "@/lib/api/rate-limit";

export async function enforceRateLimit(route: string, limit = 40) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const result = rateLimit(`${route}:${ip}`, limit);
  if (!result.ok) {
    throw new ApiError(429, `Rate limit exceeded. Retry in ${result.retryAfterSec}s`, "rate_limited");
  }
}

export function requireUserId(body: { userId?: string; privyId?: string }) {
  const id = body.userId ?? body.privyId;
  if (!id) throw new ApiError(400, "userId or privyId required", "bad_request");
  return id;
}
