// Demo research data — deterministic, derived from the simulated market so
// research surfaces are populated and consistent in demo mode. Clearly
// demo-derived: figures are generated from the symbol, not real filings.
import { getStockDef, getPrice, getChangePct } from './demoMarket';

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** 0..1 deterministic pseudo-random from a seed string. */
function prand(seed: string): number {
  const h = hashCode(seed);
  return ((h * 2654435761) % 10000) / 10000;
}

const FIRMS = ['Kabwe Securities', 'Lusaka Capital Partners', 'Zambezi Research', 'Copperbelt Analytics'];

export const DemoResearch = {
  analystRatings(symbol: string) {
    const price = getPrice(symbol);
    return FIRMS.map((firm, i) => {
      const drift = (prand(`${symbol}-${firm}`) - 0.35) * 0.5; // -17.5% .. +32.5%
      const target = price * (1 + drift);
      return {
        id: `rating-${symbol}-${i}`,
        symbol,
        analyst_firm: firm,
        rating: target >= price ? 'Buy' : 'Hold',
        price_target: Math.round(target * 100) / 100,
        previous_price_target: Math.round(target * (0.92 + prand(`${firm}-prev`) * 0.1) * 100) / 100,
        rating_date: new Date(Date.now() - (i + 1) * 5 * 86400000).toISOString(),
      };
    });
  },

  fundamentals(symbol: string) {
    const def = getStockDef(symbol);
    if (!def) return null;
    const price = getPrice(symbol);
    const sharesOutstanding = 50_000_000 + prand(`${symbol}-shares`) * 2_000_000_000;
    const pe = 8 + prand(`${symbol}-pe`) * 30;
    const eps = price / pe;
    return {
      symbol,
      name: def.name,
      market_cap: Math.round(price * sharesOutstanding),
      pe_ratio: Math.round(pe * 100) / 100,
      eps: Math.round(eps * 100) / 100,
      dividend_yield: Math.round(prand(`${symbol}-div`) * 500) / 100,
    };
  },

  marketNews(symbol: string) {
    const def = getStockDef(symbol);
    const name = def?.name || symbol;
    const change = getChangePct(symbol);
    const direction = change >= 0 ? 'gains' : 'eases';
    const templates = [
      { title: `${name} ${direction} in today's session as volumes build`, sentiment: change >= 0 ? 'positive' : 'negative' },
      { title: `Analysts weigh in on ${name} ahead of earnings`, sentiment: 'positive' },
      { title: `${def?.market === 'LuSE' ? 'LuSE' : 'Market'} wrap: ${symbol} among the most active counters`, sentiment: change >= 0 ? 'positive' : 'negative' },
      { title: `What investors are watching in ${name} this week`, sentiment: 'positive' },
    ];
    return templates.map((t, i) => ({
      id: `news-${symbol}-${i}`,
      title: t.title,
      source: 'PalmTrader Demo Wire',
      url: '#',
      sentiment: t.sentiment,
      symbols: [symbol],
      published_at: new Date(Date.now() - (i * 7 + 2) * 3600000).toISOString(),
    }));
  },
};
