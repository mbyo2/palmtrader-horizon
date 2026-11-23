import { DemoResearch } from "@/services/demo/demoResearch";

const NEWS_SYMBOLS = ["BTC-USDT", "AAPL", "ZCCM", "NVDA"];

/**
 * Market news as a hairline list — headline, source, time. The way the real
 * brokers render it: no cards, no thumbnails, no decoration.
 */
const NewsList = () => {
  const items = NEWS_SYMBOLS.flatMap((s) => DemoResearch.marketNews(s).slice(0, 1))
    .concat(DemoResearch.marketNews("ETH-USDT").slice(0, 1));

  return (
    <div className="divide-y divide-border border-t border-border">
      {items.map((item) => (
        <div key={item.id} className="py-3">
          <p className="text-sm font-medium leading-snug text-foreground">{item.title}</p>
          <p className="pt-1 text-xs text-muted-foreground">
            {item.source} ·{" "}
            {new Date(item.published_at).toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            · {item.symbols.join(", ")}
          </p>
        </div>
      ))}
    </div>
  );
};

export default NewsList;
