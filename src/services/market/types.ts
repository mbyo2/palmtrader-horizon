
export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  type?: string;
}

export type MarketDataCallback = (data: MarketData) => void;
