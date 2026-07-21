import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";

const USDC_MINT =
  process.env.NEXT_PUBLIC_USDC_MINT ?? "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export function getConnection() {
  const rpc =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
  return new Connection(rpc, "confirmed");
}

export async function readSolAndUsdcBalances(walletAddress: string) {
  const connection = getConnection();
  const owner = new PublicKey(walletAddress);

  const lamports = await connection.getBalance(owner, "confirmed");
  const sol = lamports / LAMPORTS_PER_SOL;

  let usdc = 0;
  try {
    const ata = await getAssociatedTokenAddress(new PublicKey(USDC_MINT), owner);
    const account = await getAccount(connection, ata, "confirmed");
    usdc = Number(account.amount) / 1e6;
  } catch {
    usdc = 0;
  }

  return {
    walletAddress,
    sol,
    usdc,
    usdcMint: USDC_MINT,
    fetchedAt: new Date().toISOString(),
  };
}
