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
      where: { userId, status: "open" },
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    const title = hedges[0]?.marketTitle?.slice(0, 42) ?? "Protect the plan";
    const side = hedges[0]?.side ?? "NO";
    const stake = hedges[0] ? `$${hedges[0].stakeUsd}` : "Live demo";

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0c0b0a"/>
      <stop offset="100%" stop-color="#1a1510"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <circle cx="1020" cy="80" r="220" fill="#ffb347" fill-opacity="0.16"/>
  <text x="72" y="120" fill="#ffb347" font-family="ui-sans-serif, system-ui" font-size="28" letter-spacing="6">HEDGE</text>
  <text x="72" y="220" fill="#f6f1e8" font-family="Georgia, serif" font-size="64">${side} · ${stake}</text>
  <text x="72" y="300" fill="#f6f1e8" font-family="Georgia, serif" font-size="40">${title.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>
  <text x="72" y="420" fill="#9a958c" font-family="ui-sans-serif, system-ui" font-size="28">Code ${user.referralCode}</text>
  <text x="72" y="560" fill="#6f6a62" font-family="ui-sans-serif, system-ui" font-size="22">Independent spike · Solana + prediction markets</text>
</svg>`;

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=30",
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}
