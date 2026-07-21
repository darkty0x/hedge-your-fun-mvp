import { jsonError, jsonOk, ApiError } from "@/lib/api/errors";
import { enforceRateLimit } from "@/lib/api/request";
import { readSolAndUsdcBalances } from "@/lib/solana/balances";

export async function GET(req: Request) {
  try {
    await enforceRateLimit("balances", 40);
    const wallet = new URL(req.url).searchParams.get("wallet");
    if (!wallet) throw new ApiError(400, "wallet query required", "bad_request");

    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)) {
      throw new ApiError(400, "Invalid Solana address", "bad_request");
    }

    const balances = await readSolAndUsdcBalances(wallet);
    return jsonOk(balances);
  } catch (err) {
    return jsonError(err);
  }
}
