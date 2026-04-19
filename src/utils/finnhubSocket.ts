// Thin re-export for backward compatibility. The implementation lives in
// src/utils/finnhub-realtime/ and is split into focused modules:
//   - ApiKeyFetcher: retrieves the Finnhub API key from the edge function
//   - ConnectionManager: WebSocket lifecycle, reconnect, heartbeat
//   - MessageHandler: parses trade messages and notifies listeners
//   - index.ts: orchestrates subscriptions and exposes the singleton
export { finnhubSocket } from './finnhub-realtime';
export type { MarketData, MarketDataCallback, ConnectionStatus } from './finnhub-realtime';
