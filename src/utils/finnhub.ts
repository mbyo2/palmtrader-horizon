
import { FinnhubSocket } from './finnhub/FinnhubSocket';

// Create a singleton instance that will fetch API key from the edge function
const createFinnhubSocket = async () => {
  try {
    // Try to get API key from edge function
    const response = await fetch('/api/finnhub-websocket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_api_key' })
    });
    
    if (response.ok) {
      const data = await response.json();
      return new FinnhubSocket(data.apiKey);
    }
  } catch (error) {
    console.warn('Could not fetch Finnhub API key, using demo mode:', error);
  }
  
  // Fallback to demo mode
  return new FinnhubSocket("demo");
};

// Export a promise that resolves to the socket instance
export const finnhubSocket = await createFinnhubSocket();

// Only enable debug mode in development, but disable simulations
if (import.meta.env.DEV) {
  finnhubSocket.setDebug(true);
  console.log('Finnhub socket initialized for development with real API data');
}
