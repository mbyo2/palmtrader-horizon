
export interface MarketData {
  symbol: string;
  timestamp: string;
  price: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  type: 'stock' | 'crypto' | 'forex';
}

export type MarketDataCallback = (payload: MarketData) => void;
