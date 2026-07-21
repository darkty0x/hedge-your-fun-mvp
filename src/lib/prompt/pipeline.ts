import { searchAllMarkets } from "@/lib/providers";
import type { MarketQuote, MarketSide } from "@/lib/providers/types";

export interface ParsedIntent {
  raw: string;
  asset?: string;
  direction: "protect_downside" | "protect_upside" | "event" | "unknown";
  sideBias: MarketSide;
  keywords: string[];
  stakeUsd: number;
  refusal?: string;
}

const ASSET_ALIASES: Record<string, string[]> = {
  bitcoin: ["btc", "bitcoin"],
  solana: ["sol", "solana"],
  ethereum: ["eth", "ethereum"],
  rates: ["fed", "rate", "fomc", "cpi", "inflation"],
};

function heuristicParse(raw: string): ParsedIntent {
  const text = raw.trim();
  if (text.length < 4) {
    return {
      raw: text,
      direction: "unknown",
      sideBias: "YES",
      keywords: [],
      stakeUsd: 25,
      refusal: "Intent too short — describe what you want to hedge.",
    };
  }

  const lower = text.toLowerCase();
  let asset: string | undefined;
  for (const [name, aliases] of Object.entries(ASSET_ALIASES)) {
    if (aliases.some((a) => lower.includes(a))) {
      asset = name;
      break;
    }
  }

  const protectDown =
    /crash|down|drop|bear|protect|hedge|loss|decline|below/.test(lower);
  const protectUp = /moon|rally|above|upside|spike|breakout/.test(lower);
  const stakeMatch = lower.match(/\$?\s*(\d+(?:\.\d+)?)\s*(usdc|usd|dollars?)?/);
  const stakeUsd = stakeMatch ? Number(stakeMatch[1]) : 25;

  if (stakeUsd > 10_000) {
    return {
      raw: text,
      asset,
      direction: "unknown",
      sideBias: "YES",
      keywords: [],
      stakeUsd,
      refusal: "Stake exceeds demo limit ($10,000). Lower the size.",
    };
  }

  const direction = protectDown
    ? "protect_downside"
    : protectUp
      ? "protect_upside"
      : /election|fed|cpi|rate|event/.test(lower)
        ? "event"
        : "unknown";

  const sideBias: MarketSide =
    direction === "protect_downside" ? "NO" : direction === "protect_upside" ? "YES" : "YES";

  const keywords = lower
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 8);

  return { raw: text, asset, direction, sideBias, keywords, stakeUsd };
}

async function llmRefine(intent: ParsedIntent): Promise<ParsedIntent> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return intent;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Parse hedge intents for prediction markets. Return JSON with keys: asset, direction (protect_downside|protect_upside|event|unknown), sideBias (YES|NO), keywords (string[]), stakeUsd (number), refusal (string|null).",
          },
          { role: "user", content: intent.raw },
        ],
      }),
    });
    if (!res.ok) return intent;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return intent;
    const parsed = JSON.parse(content) as Partial<ParsedIntent>;
    return {
      ...intent,
      ...parsed,
      raw: intent.raw,
      keywords: parsed.keywords ?? intent.keywords,
      stakeUsd: parsed.stakeUsd ?? intent.stakeUsd,
      sideBias: parsed.sideBias ?? intent.sideBias,
      direction: parsed.direction ?? intent.direction,
      refusal: parsed.refusal || undefined,
    };
  } catch {
    return intent;
  }
}

export interface PipelineResult {
  intent: ParsedIntent;
  matches: Array<MarketQuote & { score: number; reason: string }>;
}

function scoreMarket(intent: ParsedIntent, market: MarketQuote) {
  const hay = `${market.title} ${market.description ?? ""}`.toLowerCase();
  let score = 0;
  const hits: string[] = [];
  for (const kw of intent.keywords) {
    if (hay.includes(kw)) {
      score += 2;
      hits.push(kw);
    }
  }
  if (intent.asset && hay.includes(intent.asset.slice(0, 3))) score += 3;
  if (market.live) score += 1;
  score += Math.min(2, (market.volume ?? 0) / 5_000_000);
  return {
    score,
    reason: hits.length ? `Matched: ${hits.join(", ")}` : "Semantic/volume fallback",
  };
}

export async function runPromptPipeline(raw: string): Promise<PipelineResult> {
  let intent = heuristicParse(raw);
  intent = await llmRefine(intent);

  if (intent.refusal) {
    return { intent, matches: [] };
  }

  const query = [intent.asset, ...intent.keywords].filter(Boolean).join(" ");
  const markets = await searchAllMarkets(query || raw, 12);
  const matches = markets
    .map((m) => {
      const { score, reason } = scoreMarket(intent, m);
      return { ...m, score, reason };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  if (matches.length === 0) {
    intent = {
      ...intent,
      refusal: "No markets matched — try naming an asset or event (e.g. BTC crash, Fed cut).",
    };
  }

  return { intent, matches };
}
