import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api/errors";
import { enforceRateLimit } from "@/lib/api/request";
import { upsertUser } from "@/lib/users";

const schema = z.object({
  privyId: z.string().min(1),
  walletAddress: z.string().optional().nullable(),
  referralCode: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    await enforceRateLimit("users");
    const body = schema.parse(await req.json());
    const user = await upsertUser(body);
    return jsonOk(user);
  } catch (err) {
    return jsonError(err);
  }
}
