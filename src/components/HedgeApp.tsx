"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
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

const SUGGESTIONS = [
  "Protect my SOL bag if it crashes — $50",
  "Hedge BTC downside into year end — $100",
  "Bet on a Fed rate cut next meeting — $25",
];

export function HedgeApp() {
  const privyEnabled = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);
  if (privyEnabled) return <HedgeAppPrivy />;
  return <HedgeAppInner demoMode privyId={DEMO_PRIVY_ID} />;
}

function HedgeAppPrivy() {
  const { authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  if (!authenticated || !user) {
    return (
      <Phone>
        <div className="flex flex-1 flex-col justify-end gap-6 p-6 pb-10">
          <Brand />
          <p className="text-[15px] leading-relaxed text-[var(--muted)]">
            Say what you want to protect. We match prediction markets and open a hedge on Solana.
          </p>
          <button
            type="button"
            onClick={() => login()}
            className="w-full rounded-2xl bg-[var(--ink)] px-4 py-3.5 text-[15px] font-semibold text-[#0c0b0a]"
          >
            Continue with wallet
          </button>
        </div>
      </Phone>
    );
  }
  return (
    <HedgeAppInner
      demoMode={false}
      privyId={user.id}
      walletAddress={wallets[0]?.address}
      onLogout={() => logout()}
    />
  );
}

function Brand() {
  return (
    <div className="animate-rise space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
        Hedge
      </p>
      <h1 className="font-serif text-[2.65rem] leading-[1.05] tracking-[-0.02em] text-[var(--ink)]">
        Protect the plan.
        <br />
        Not just the bag.
      </h1>
    </div>
  );
}

function Phone({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-3 py-4 sm:px-4 sm:py-8">
      <div className="relative flex min-h-[min(860px,100vh-2rem)] flex-1 flex-col overflow-hidden rounded-[2rem] border border-[var(--line)] bg-[rgba(12,11,10,0.88)] shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(255,179,71,0.16),transparent_70%)]" />
        {children}
      </div>
      <p className="mt-4 px-2 text-center text-[11px] leading-relaxed text-[var(--muted)]">
        Independent production spike for Superteam ·{" "}
        <Link className="underline decoration-[var(--line)] underline-offset-2" href="/portfolio">
          portfolio
        </Link>{" "}
        ·{" "}
        <Link className="underline decoration-[var(--line)] underline-offset-2" href="/cv">
          CV
        </Link>
        · not the sponsor&apos;s production app
      </p>
    </main>
  );
}

function HedgeAppInner({
  demoMode,
  privyId,
  walletAddress,
  onLogout,
}: {
  demoMode: boolean;
  privyId: string;
  walletAddress?: string;
  onLogout?: () => void;
}) {
  const [intent, setIntent] = useState(SUGGESTIONS[0]);
  const [matches, setMatches] = useState<MarketMatch[]>([]);
  const [parsed, setParsed] = useState<Record<string, unknown> | null>(null);
  const [hedges, setHedges] = useState<Hedge[]>([]);
  const [balances, setBalances] = useState<{ sol: number; usdc: number } | null>(null);
  const [pnl, setPnl] = useState(0);
  const [livePositions, setLivePositions] = useState<
    Array<{ id: string; unrealizedPnL: number; currentPrice: number }>
  >([]);
  const [referral, setReferral] = useState<{
    referralCode: string;
    shareUrl: string;
    cardUrl: string;
  } | null>(null);
  const [busy, setBusy] = useState("");
  const [step, setStep] = useState<"compose" | "markets" | "positions">("compose");
  const [toast, setToast] = useState<string | null>(null);
  const [side, setSide] = useState<"YES" | "NO">("NO");
  const autoRan = useRef(false);

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

  const runMatch = useCallback(
    async (text = intent) => {
      setBusy("Finding markets…");
      setToast(null);
      try {
        const res = await fetch("/api/prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intent: text }),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error?.message ?? "Match failed");
        setParsed(json.data.intent);
        setMatches(json.data.matches ?? []);
        if (json.data.intent?.sideBias) setSide(json.data.intent.sideBias);
        if (json.data.intent?.refusal) setToast(json.data.intent.refusal);
        else setStep("markets");
        return json.data.matches as MarketMatch[];
      } catch (e) {
        setToast(e instanceof Error ? e.message : "Match failed");
        return [] as MarketMatch[];
      } finally {
        setBusy("");
      }
    },
    [intent],
  );

  const openHedge = useCallback(
    async (market: MarketMatch, chosenSide: "YES" | "NO", stakeOverride?: number) => {
      setBusy("Opening hedge…");
      try {
        const stakeUsd =
          stakeOverride ??
          (typeof parsed?.stakeUsd === "number" ? (parsed.stakeUsd as number) : 50);
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
            side: chosenSide,
            stakeUsd,
          }),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error?.message ?? "Open failed");
        await refreshHedges();
        await refreshReferral();
        setStep("positions");
        setToast("Hedge is live — P&L updates in realtime.");
      } catch (e) {
        setToast(e instanceof Error ? e.message : "Open failed");
      } finally {
        setBusy("");
      }
    },
    [parsed, privyId, demoMode, walletAddress, intent, refreshHedges, refreshReferral],
  );

  useEffect(() => {
    void (async () => {
      await ensureUser();
      await refreshHedges();
      await refreshReferral();
    })();
  }, [ensureUser, refreshHedges, refreshReferral]);

  useEffect(() => {
    if (demoMode || !walletAddress) {
      setBalances({ sol: 12.48, usdc: 1_280.4 });
      return;
    }
    void fetch(`/api/balances?wallet=${encodeURIComponent(walletAddress)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) setBalances({ sol: json.data.sol, usdc: json.data.usdc });
      });
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

  // Auto-demo: match + open best market once so reviewers see value immediately
  useEffect(() => {
    if (autoRan.current) return;
    autoRan.current = true;
    const timer = window.setTimeout(() => {
      void (async () => {
        const found = await runMatch(SUGGESTIONS[0]);
        if (found?.[0]) {
          await openHedge(found[0], "NO", 50);
        }
      })();
    }, 600);
    return () => window.clearTimeout(timer);
    // intentionally once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      setToast(`Closed · realized ${Number(json.data.realizedPnL).toFixed(2)} USDC`);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Close failed");
    } finally {
      setBusy("");
    }
  }

  const openHedges = hedges.filter((h) => h.status === "open");

  return (
    <Phone>
      <header className="relative z-10 flex items-center justify-between px-5 pb-2 pt-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            Hedge
          </p>
          <p className="text-[12px] text-[var(--muted)]">
            {demoMode ? "Demo wallet" : "Privy wallet"}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[13px] text-[var(--ink)]">
            {balances ? `${balances.usdc.toLocaleString(undefined, { maximumFractionDigits: 0 })} USDC` : "—"}
          </p>
          <p className="font-mono text-[11px] text-[var(--muted)]">
            {balances ? `${balances.sol.toFixed(2)} SOL` : ""}
          </p>
        </div>
      </header>

      <section className="relative z-10 mx-5 mt-2 animate-rise rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[12px] text-[var(--muted)]">Realtime P&amp;L</p>
            <p
              className={`mt-1 font-serif text-[2.4rem] leading-none tracking-tight ${
                pnl >= 0 ? "text-[var(--good)]" : "text-[var(--bad)]"
              }`}
            >
              {pnl >= 0 ? "+" : ""}
              {pnl.toFixed(2)}
            </p>
          </div>
          <div className="rounded-full border border-[var(--line)] px-3 py-1 text-[11px] text-[var(--muted)]">
            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--good)] animate-pulse-soft" />
            SSE live
          </div>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5">
          <div className="live-bar h-full w-2/3 rounded-full" />
        </div>
        {referral && (
          <p className="mt-3 text-[12px] text-[var(--muted)]">
            Invite code{" "}
            <span className="font-mono text-[var(--ink)]">{referral.referralCode}</span>
          </p>
        )}
      </section>

      <nav className="relative z-10 mx-5 mt-4 grid grid-cols-3 gap-1 rounded-2xl border border-[var(--line)] bg-black/20 p-1 text-[12px]">
        {(
          [
            ["compose", "Intent"],
            ["markets", "Markets"],
            ["positions", "Positions"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setStep(id)}
            className={`rounded-xl px-2 py-2 ${
              step === id ? "bg-[var(--ink)] text-[#0c0b0a]" : "text-[var(--muted)]"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="relative z-10 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {toast && (
          <p className="rounded-2xl border border-[var(--line)] bg-black/30 px-3 py-2 text-[13px] text-[var(--ink)]">
            {toast}
          </p>
        )}
        {busy && <p className="text-[13px] text-[var(--muted)]">{busy}</p>}

        {step === "compose" && (
          <div className="animate-rise space-y-4">
            <Brand />
            <label className="block text-[12px] text-[var(--muted)]" htmlFor="intent">
              What do you want to protect?
            </label>
            <textarea
              id="intent"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-2xl border border-[var(--line)] bg-black/25 p-4 text-[15px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            />
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setIntent(s)}
                  className="rounded-full border border-[var(--line)] px-3 py-1.5 text-left text-[11px] text-[var(--muted)]"
                >
                  {s.split("—")[0]}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void runMatch()}
                className="flex-1 rounded-2xl bg-[var(--accent)] px-4 py-3.5 text-[15px] font-semibold text-[#1a1208] disabled:opacity-50"
              >
                Match markets
              </button>
              <select
                value={side}
                onChange={(e) => setSide(e.target.value as "YES" | "NO")}
                className="rounded-2xl border border-[var(--line)] bg-black/30 px-3 text-[13px]"
              >
                <option value="YES">YES</option>
                <option value="NO">NO</option>
              </select>
            </div>
          </div>
        )}

        {step === "markets" && (
          <div className="animate-rise space-y-3">
            <h2 className="font-serif text-2xl text-[var(--ink)]">Matched markets</h2>
            <p className="text-[13px] text-[var(--muted)]">
              Polymarket + Kalshi adapters · ranked by intent fit
            </p>
            {matches.map((m, i) => (
              <article
                key={`${m.provider}-${m.id}`}
                className="rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-4"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-[var(--muted)]">
                      {m.provider}
                    </p>
                    <h3 className="mt-1 text-[15px] font-medium leading-snug text-[var(--ink)]">
                      {m.title}
                    </h3>
                  </div>
                  <span className="rounded-full bg-white/5 px-2 py-1 font-mono text-[11px] text-[var(--accent)]">
                    {m.score.toFixed(1)}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <PricePill label="YES" price={m.yesPrice} />
                  <PricePill label="NO" price={m.noPrice} />
                </div>
                <p className="mt-3 text-[12px] text-[var(--muted)]">{m.reason}</p>
                <button
                  type="button"
                  onClick={() => void openHedge(m, side)}
                  className="mt-4 w-full rounded-2xl bg-[var(--ink)] py-3 text-[14px] font-semibold text-[#0c0b0a]"
                >
                  Open {side} hedge
                </button>
              </article>
            ))}
            {!matches.length && (
              <p className="text-[13px] text-[var(--muted)]">No matches yet — try an intent.</p>
            )}
          </div>
        )}

        {step === "positions" && (
          <div className="animate-rise space-y-3">
            <h2 className="font-serif text-2xl text-[var(--ink)]">Your hedges</h2>
            <p className="text-[13px] text-[var(--muted)]">
              Persisted in DB · streamed over SSE · not localStorage
            </p>
            {hedges.map((h) => {
              const live = livePositions.find((p) => h.positions.some((hp) => hp.id === p.id));
              return (
                <article
                  key={h.id}
                  className="rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-[var(--muted)]">
                        {h.side} · {h.provider} · ${h.stakeUsd}
                      </p>
                      <h3 className="mt-1 text-[15px] leading-snug text-[var(--ink)]">
                        {h.marketTitle}
                      </h3>
                    </div>
                    <span
                      className={`font-mono text-[14px] ${
                        (live?.unrealizedPnL ?? 0) >= 0
                          ? "text-[var(--good)]"
                          : "text-[var(--bad)]"
                      }`}
                    >
                      {live
                        ? `${live.unrealizedPnL >= 0 ? "+" : ""}${live.unrealizedPnL.toFixed(2)}`
                        : h.status}
                    </span>
                  </div>
                  {h.status === "open" && (
                    <button
                      type="button"
                      onClick={() => void closeHedge(h)}
                      className="mt-4 w-full rounded-2xl border border-[var(--line)] py-2.5 text-[13px] text-[var(--muted)]"
                    >
                      Close position
                    </button>
                  )}
                </article>
              );
            })}
            {!hedges.length && (
              <p className="text-[13px] text-[var(--muted)]">No positions yet.</p>
            )}
            {referral?.cardUrl && openHedges.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-[12px] text-[var(--muted)]">Shareable hedge card</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={referral.cardUrl}
                  alt="Share card"
                  className="w-full rounded-2xl border border-[var(--line)]"
                />
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="relative z-10 flex items-center justify-between border-t border-[var(--line)] px-5 py-3 text-[11px] text-[var(--muted)]">
        <span>{openHedges.length} open</span>
        {onLogout ? (
          <button type="button" onClick={onLogout}>
            Log out
          </button>
        ) : (
          <Link href="/portfolio">Why this stack →</Link>
        )}
      </footer>
    </Phone>
  );
}

function PricePill({ label, price }: { label: string; price: number }) {
  return (
    <div className="rounded-2xl bg-black/25 p-3">
      <div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
        <span>{label}</span>
        <span className="font-mono text-[var(--ink)]">{(price * 100).toFixed(0)}¢</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-full rounded-full ${label === "YES" ? "bg-[var(--good)]" : "bg-[var(--accent)]"}`}
          style={{ width: `${Math.max(6, Math.min(100, price * 100))}%` }}
        />
      </div>
    </div>
  );
}
