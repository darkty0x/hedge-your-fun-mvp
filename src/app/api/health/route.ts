import { jsonOk } from "@/lib/api/errors";
import { getProvider } from "@/lib/providers";
import { getKeyRotationStatus } from "@/lib/api/keys";

export async function GET() {
  return jsonOk({
    name: "hedge-your-fun-mvp-spike",
    disclaimer:
      "Independent technical spike for Superteam application — not affiliated / not their production repo.",
    providers: {
      polymarket: { live: getProvider("polymarket").isLive },
      kalshi: { live: getProvider("kalshi").isLive },
    },
    keys: [getKeyRotationStatus("POLYMARKET"), getKeyRotationStatus("KALSHI")],
    features: [
      "privy-wallets",
      "sol-usdc-balances",
      "polymarket+kalshi-adapters",
      "postgres-ready-prisma",
      "sse-pnl",
      "prompt-pipeline",
      "referrals-share-cards",
      "rate-limit-retry-key-rotation",
      "pwa",
    ],
  });
}
