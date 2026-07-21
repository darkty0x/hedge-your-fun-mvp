"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";

type MarketMatch = {
  id: string;
  provider: "polymarket" | "kalshi";
  title: string;
  yesPrice: number;
  noPrice: number;
  live: boolean;
  score: number;
  reason: string;
};

type Hedge = {
  id: string;
  marketTitle: string;
  side: string;
  stakeUsd: number;
  status: string;
  provider: string;
  positions: Array<{
    id: string;
    unrealizedPnL: number;
    currentPrice: number;
    entryPrice: number;
    status: string;
  }>;
};

const DEMO_PRIVY_ID = "demo-founder";

export function HedgeApp() {
  const privyEnabled = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);
  if (privyEnabled) return <HedgeAppPrivy />;
  return <HedgeAppInner demoMode privyId={DEMO_PRIVY_ID} walletAddress={undefined} />;
}

function HedgeAppPrivy() {
  const { authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const walletAddress = wallets[0]?.address;

  if (!authenticated || !user) {
    return (
      <Shell>
        <section className="rounded-2xl border border-emerald-500/20 bg-emerald-950/40 p-4">
          <p className="mb-3 text-sm text-emerald-100/80">
            Connect with Privy to use your embedded Solana wallet
          </p>
          <button
            type="button"
            onClick={() => login()}
            className="rounded-lg bg-emerald-400 px-3 py-2 text-sm font-medium text-emerald-950"
          >
            Login with Privy
          </button>
        </section>
      </Shell>
    );
  }

  return (
    <HedgeAppInner
      demoMode={false}
      privyId={user.id}
      walletAddress={walletAddress}
      email={user.email?.address}
      onLogout={() => logout()}
    />
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">
          Technical spike · Superteam application
        </p>
        <h1 className="font-serif text-4xl leading-tight text-emerald-50 sm:text-5xl">
          Hedge Your Fun
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-emerald-100/70">
          Independent production-style spike: Privy wallets, Solana balances, Polymarket + Kalshi
          adapters, persistent hedges, SSE P&amp;L, prompt matching, referrals, PWA. Not affiliated
          with the sponsor&apos;s production repo.
        </p>
      </header>
      {children}
    </div>
  );
}

function HedgeAppInner({
  demoMode,
  privyId,
  walletAddress,
  email,
  onLogout,
}: {
  demoMode: boolean;
  privyId: string;
  walletAddress?: string;
  email?: string;
  onLogout?: () => void;
}) {
  const [intent, setIntent] = useState(
    "Hedge my SOL bag against a crash — $50 on downside protection",
  );
  const [matches, setMatches] = useState<MarketMatch[]>([]);
  const [parsed, setParsed] = useState<Record<string, unknown> | null>(null);
  const [hedges, setHedges] = useState<Hedge[]>([]);
  const [balances, setBalances] = useState<{
    sol: number;
    usdc: number;
    walletAddress: string;
  } | null>(null);
  const [pnl, setPnl] = useState(0);
  const [livePositions, setLivePositions] = useState<
    Array<{ id: string; unrealizedPnL: number; currentPrice: number }>
  >([]);
  const [referral, setReferral] = useState<{
    referralCode: string;
    shareUrl: string;
    cardUrl: string;
    notifications: Array<{ id: string; title: string; body: string }>;
  } | null>(null);
  const [busy, setBusy] = useState("");
  const [banner, setBanner] = useState<string | null>(null);
  const [side, setSide] = useState<"YES" | "NO">("NO");

  const ensureUser = useCallback(async () => {
    const ref =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("ref")
        : null;
    await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        privyId,
        walletAddress: demoMode ? null : walletAddress,
        referralCode: ref,
      }),
    });
  }, [privyId, walletAddress, demoMode]);

  const refreshHedges = useCallback(async () => {
    const res = await fetch(`/api/hedges?privyId=${encodeURIComponent(privyId)}`);
    const json = await res.json();
    if (json.ok) setHedges(json.data.hedges ?? []);
  }, [privyId]);

  const refreshReferral = useCallback(async () => {
    const res = await fetch(`/api/refer?privyId=${encodeURIComponent(privyId)}`);
    const json = await res.json();
    if (json.ok) setReferral(json.data);
  }, [privyId]);

  useEffect(() => {
    void (async () => {
      await ensureUser();
      await refreshHedges();
      await refreshReferral();
    })();
  }, [ensureUser, refreshHedges, refreshReferral]);

  useEffect(() => {
    if (demoMode || !walletAddress) {
      setBalances({
        sol: 1.25,
        usdc: 420.5,
        walletAddress: demoMode ? "DemoWallet (fixture balances)" : walletAddress ?? "—",
      });
      return;
    }
    void fetch(`/api/balances?wallet=${encodeURIComponent(walletAddress)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) setBalances(json.data);
      })
      .catch(() => setBanner("Balance fetch failed — check RPC."));
  }, [walletAddress, demoMode]);

  useEffect(() => {
    const es = new EventSource(`/api/pnl/stream?privyId=${encodeURIComponent(privyId)}`);
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as {
          type: string;
          totalPnL?: number;
          positions?: Array<{ id: string; unrealizedPnL: number; currentPrice: number }>;
        };
        if (data.type === "pnl") {
          setPnl(data.totalPnL ?? 0);
          setLivePositions(data.positions ?? []);
        }
      } catch {
        /* ignore */
      }
    };
    return () => es.close();
  }, [privyId]);

  async function runMatch() {
    setBusy("Matching markets…");
    setBanner(null);
    try {
      const res = await fetch("/api/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "Prompt failed");
      setParsed(json.data.intent);
      setMatches(json.data.matches ?? []);
      if (json.data.intent?.sideBias) setSide(json.data.intent.sideBias);
      if (json.data.intent?.refusal) setBanner(json.data.intent.refusal);
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Match failed");
    } finally {
      setBusy("");
    }
  }

  async function openHedge(market: MarketMatch) {
    setBusy("Opening hedge…");
    try {
      const stakeUsd =
        typeof parsed?.stakeUsd === "number" ? (parsed.stakeUsd as number) : 25;
      const res = await fetch("/api/hedges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          privyId,
          walletAddress: demoMode ? null : walletAddress,
          intent,
          parsedIntent: JSON.stringify(parsed ?? {}),
          provider: market.provider,
          marketId: market.id,
          marketTitle: market.title,
          side,
          stakeUsd,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "Open failed");
      await refreshHedges();
      await refreshReferral();
      setBanner(
        json.data.order?.paper
          ? "Paper hedge opened (fixture/provider paper mode)."
          : "Hedge opened.",
      );
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Open failed");
    } finally {
      setBusy("");
    }
  }

  async function closeHedge(hedge: Hedge) {
    const position = hedge.positions.find((p) => p.status === "open");
    if (!position) return;
    setBusy("Closing…");
    try {
      const res = await fetch(`/api/hedges/${hedge.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privyId, positionId: position.id }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? "Close failed");
      await refreshHedges();
      setBanner(`Closed. Realized P&L: ${Number(json.data.realizedPnL).toFixed(2)}`);
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Close failed");
    } finally {
      setBusy("");
    }
  }

  const providerBadge = useMemo(() => {
    if (!matches.length) return "Providers: Polymarket + Kalshi adapters";
    return matches.some((m) => m.live)
      ? "Live provider data mixed with fixtures"
      : "Fixture / paper mode (add API keys for live)";
  }, [matches]);

  return (
    <Shell>
      <section className="rounded-2xl border border-emerald-500/20 bg-emerald-950/40 p-4 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-emerald-100/80">
              {demoMode
                ? "Demo auth (set NEXT_PUBLIC_PRIVY_APP_ID for Privy)"
                : `Signed in · ${email ?? privyId}`}
            </p>
            {balances && (
              <p className="mt-1 font-mono text-sm text-emerald-300">
                SOL {balances.sol.toFixed(4)} · USDC {balances.usdc.toFixed(2)}
              </p>
            )}
          </div>
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg bg-emerald-900 px-3 py-2 text-sm text-emerald-100"
            >
              Log out
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-emerald-100/50">Realtime P&amp;L </span>
            <span className={`font-mono ${pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
              {pnl >= 0 ? "+" : ""}
              {pnl.toFixed(2)} USDC
            </span>
          </div>
          {referral && (
            <div className="text-emerald-100/80">
              Referral <span className="font-mono text-emerald-300">{referral.referralCode}</span>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <label className="block text-sm text-emerald-100/70" htmlFor="intent">
          Hedge intent
        </label>
        <textarea
          id="intent"
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-emerald-500/20 bg-black/30 p-3 text-emerald-50 outline-none ring-emerald-400/40 focus:ring"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void runMatch()}
            className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-medium text-emerald-950 disabled:opacity-50"
          >
            Match markets
          </button>
          <div className="flex items-center gap-2 text-sm text-emerald-100/70">
            Side
            <select
              value={side}
              onChange={(e) => setSide(e.target.value as "YES" | "NO")}
              className="rounded-md border border-emerald-500/30 bg-emerald-950 px-2 py-1"
            >
              <option value="YES">YES</option>
              <option value="NO">NO</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-emerald-100/50">{providerBadge}</p>
      </section>

      {banner && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-950/40 px-3 py-2 text-sm text-amber-100">
          {banner}
        </p>
      )}
      {busy && <p className="text-sm text-emerald-200/70">{busy}</p>}

      <section className="space-y-2">
        <h2 className="text-lg text-emerald-50">Matched markets</h2>
        <ul className="space-y-2">
          {matches.map((m) => (
            <li
              key={`${m.provider}-${m.id}`}
              className="flex flex-col gap-2 rounded-xl border border-emerald-500/15 bg-black/25 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-emerald-50">{m.title}</p>
                <p className="text-xs text-emerald-100/50">
                  {m.provider}
                  {m.live ? " · live" : " · fixture"} · YES {m.yesPrice.toFixed(2)} / NO{" "}
                  {m.noPrice.toFixed(2)} · score {m.score.toFixed(1)} · {m.reason}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void openHedge(m)}
                className="rounded-lg border border-emerald-400/40 px-3 py-1.5 text-sm text-emerald-200"
              >
                Open {side}
              </button>
            </li>
          ))}
          {!matches.length && (
            <li className="text-sm text-emerald-100/40">Run match to see markets.</li>
          )}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg text-emerald-50">Your hedges</h2>
        <ul className="space-y-2">
          {hedges.map((h) => {
            const live = livePositions.find((p) => h.positions.some((hp) => hp.id === p.id));
            return (
              <li
                key={h.id}
                className="flex flex-col gap-2 rounded-xl border border-emerald-500/15 bg-black/25 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm text-emerald-50">
                    {h.side} · {h.marketTitle}
                  </p>
                  <p className="text-xs text-emerald-100/50">
                    {h.provider} · ${h.stakeUsd} · {h.status}
                    {live
                      ? ` · live P&L ${live.unrealizedPnL.toFixed(2)} @ ${live.currentPrice.toFixed(3)}`
                      : ""}
                  </p>
                </div>
                {h.status === "open" && (
                  <button
                    type="button"
                    onClick={() => void closeHedge(h)}
                    className="rounded-lg border border-rose-400/40 px-3 py-1.5 text-sm text-rose-200"
                  >
                    Close
                  </button>
                )}
              </li>
            );
          })}
          {!hedges.length && (
            <li className="text-sm text-emerald-100/40">
              No hedges yet — persisted in DB, not localStorage.
            </li>
          )}
        </ul>
      </section>

      {referral && (
        <section className="space-y-3 rounded-xl border border-emerald-500/15 bg-black/20 p-4">
          <h2 className="text-lg text-emerald-50">Share &amp; referrals</h2>
          <p className="break-all text-sm text-emerald-100/70">{referral.shareUrl}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={referral.cardUrl}
            alt="Shareable hedge card"
            className="w-full max-w-xl rounded-lg border border-emerald-500/20"
          />
          <ul className="space-y-1">
            {referral.notifications.map((n) => (
              <li key={n.id} className="text-xs text-emerald-100/60">
                {n.title}: {n.body}
              </li>
            ))}
          </ul>
        </section>
      )}
    </Shell>
  );
}
