import { jsonError, ApiError } from "@/lib/api/errors";
import { enforceRateLimit } from "@/lib/api/request";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ userId: string }> },
) {
  try {
    await enforceRateLimit("share-card", 60);
    const { userId } = await ctx.params;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiError(404, "User not found", "not_found");

    const hedges = await prisma.hedge.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 3,
    });

    const title = "Hedge Your Fun — Spike";
    const subtitle = `Code ${user.referralCode}`;
    const lines = hedges.length
      ? hedges.map((h) => `${h.side} · ${h.marketTitle.slice(0, 40)}`).join(" | ")
      : "Protect plans with prediction markets";

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0B1F1A"/>
      <stop offset="100%" stop-color="#1C3D32"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <circle cx="980" cy="120" r="180" fill="#3DDC97" fill-opacity="0.12"/>
  <text x="72" y="140" fill="#E8F5EF" font-family="Georgia, serif" font-size="54">${title}</text>
  <text x="72" y="210" fill="#9BC4B3" font-family="ui-sans-serif, system-ui" font-size="28">${subtitle}</text>
  <text x="72" y="320" fill="#F4FFF9" font-family="ui-sans-serif, system-ui" font-size="32">${lines.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>
  <text x="72" y="560" fill="#7FA894" font-family="ui-sans-serif, system-ui" font-size="22">Independent technical spike · not affiliated with Hedge Your Fun</text>
</svg>`;

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}
