
import { FinnhubSocket } from './finnhub/FinnhubSocket';

// Create a singleton instance
export const finnhubSocket = new FinnhubSocket();

// For development, simulate some data
if (import.meta.env.DEV) {
  finnhubSocket.simulateMarketData('AAPL', 180);
  finnhubSocket.simulateMarketData('MSFT', 320);
  finnhubSocket.simulateMarketData('GOOGL', 140);
}
