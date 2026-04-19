export interface MarketData {
  symbol: string;
  price: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  timestamp: number;
}

export type MarketDataCallback = (data: MarketData) => void;

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';
