
export interface TradeParams {
    userId: string;
    agentId?: string;
    marketId: string; // Ticker or TokenID
    outcome: string;  // "YES" / "NO"
    side: "BUY" | "SELL";
    amount: number;   // Amount in USDC
    price?: number;   // Limit price
}

export interface Market {
    id: string; // Ticker or ID
    question: string;
    outcome: string;
    bestBid: number;
    bestAsk: number;
    volume24hr: number;
    questionId?: string;
    conditionId?: string;
    tokenIds?: string[];
}

export interface Position {
    id: string;
    userId: string;
    marketId: string;
    marketTitle: string;
    outcome: string;
    shares: number;
    avgEntryPrice: number;
    initialValue: number;
    exposure: number;
    pnl: number;
    percentPnl: number;
    currentPrice: number;
    icon?: string;
}

export interface Balance {
    usdc: string;
    pol: string;
    address: string;
}

export interface TradeHistory {
    id: string;
    market: string;
    asset_id: string;
    side: string;
    size: number;
    price: number;
    timestamp: number;
    outcome: string;
    transactionHash: string;
    icon?: string;
}

// The Common Interface
export interface MarketTool {
    getName(): string;
    get_markets(limit?: number): Promise<Market[]>;
    search_markets(query: string): Promise<Market[]>;
    get_positions(userId: string): Promise<Position[] | null>;
    get_balance(userId: string): Promise<Balance | null>;
    place_trade(trade: TradeParams): Promise<{ status: string; txId: string; price: number; settlementPrice?: number }>;
    get_trades(userId: string): Promise<TradeHistory[]>;
}
