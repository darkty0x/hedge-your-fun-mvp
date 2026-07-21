export type MarketProviderId = "polymarket" | "kalshi";

export type MarketSide = "YES" | "NO";

export interface MarketQuote {
  id: string;
  provider: MarketProviderId;
  title: string;
  description?: string;
  yesPrice: number;
  noPrice: number;
  volume?: number;
  endDate?: string;
  live: boolean;
}

export interface OrderRequest {
  marketId: string;
  side: MarketSide;
  sizeUsd: number;
  userId: string;
}

export interface OrderResult {
  externalId: string;
  marketId: string;
  side: MarketSide;
  size: number;
  entryPrice: number;
  status: "open" | "filled" | "rejected";
  paper: boolean;
}

export interface PositionQuote {
  externalId: string;
  marketId: string;
  side: MarketSide;
  size: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
}

export interface MarketProvider {
  id: MarketProviderId;
  isLive: boolean;
  searchMarkets(query: string, limit?: number): Promise<MarketQuote[]>;
  getMarket(marketId: string): Promise<MarketQuote | null>;
  placeOrder(order: OrderRequest): Promise<OrderResult>;
  getPosition(externalId: string): Promise<PositionQuote | null>;
  closePosition(externalId: string): Promise<OrderResult>;
}
