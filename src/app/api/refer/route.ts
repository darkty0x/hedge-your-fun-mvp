import { jsonError, jsonOk, ApiError } from "@/lib/api/errors";
import { enforceRateLimit } from "@/lib/api/request";
import { prisma } from "@/lib/db";
import { getKeyRotationStatus } from "@/lib/api/keys";

export async function GET(req: Request) {
  try {
    await enforceRateLimit("refer", 40);
    const privyId = new URL(req.url).searchParams.get("privyId");
    if (!privyId) throw new ApiError(400, "privyId required", "bad_request");

    const user = await prisma.user.findUnique({
      where: { privyId },
      include: {
        referralsMade: true,
        notifications: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!user) throw new ApiError(404, "User not found", "not_found");

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return jsonOk({
      referralCode: user.referralCode,
      shareUrl: `${appUrl}/?ref=${user.referralCode}`,
      cardUrl: `${appUrl}/api/share/${user.id}`,
      referrals: user.referralsMade.length,
      notifications: user.notifications,
      keyRotation: [getKeyRotationStatus("POLYMARKET"), getKeyRotationStatus("KALSHI")],
    });
  } catch (err) {
    return jsonError(err);
  }
}
