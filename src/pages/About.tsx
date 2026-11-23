import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";

const About = () => {
  return (
    <>
      <Helmet>
        <title>About PalmCacia — Platform Overview</title>
        <meta name="description" content="PalmCacia is a stock and crypto trading platform founded by Mabvuto Banda, offering US stocks, crypto and Zambian (LuSE) and African market access to Zambian and global retail traders." />
        <link rel="canonical" href={`${window.location.origin}/about`} />
      </Helmet>
      <main id="main" className="container max-w-5xl py-8 space-y-8">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">About PalmCacia</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            PalmCacia is a trading platform for US stocks, crypto and Zambian (LuSE) and other African markets, with market data, portfolio tools and an order book interface.
          </p>
        </header>

        <section className="grid gap-8 md:grid-cols-3 border-t border-border pt-6">
          <article className="border-t-2 border-primary/70 pt-3">
            <h2 className="font-semibold mb-2">Our Mission</h2>
            <p className="text-sm text-muted-foreground">
              Give Zambian investors the same quality of terminal that global traders use — live data, clear fees, and tools that show their work.
            </p>
          </article>
          <article className="border-t-2 border-primary/70 pt-3">
            <h2 className="font-semibold mb-2">What We Offer</h2>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>Live market data and research</li>
              <li>Portfolio and watchlist management</li>
              <li>Alerts, notifications, and PWA support</li>
            </ul>
          </article>
          <article className="border-t-2 border-primary/70 pt-3">
            <h2 className="font-semibold mb-2">Get in Touch</h2>
            <p className="text-sm text-muted-foreground">
              Have questions? Visit our <Link className="underline underline-offset-4" to="/contact">Contact</Link> page.
            </p>
          </article>
        </section>

        <section className="border-t border-border pt-6">
          <h2 className="font-semibold mb-3">Facts about PalmCacia</h2>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>PalmCacia is a stock and crypto trading platform for Zambian and global retail traders, founded by Mabvuto Banda.</li>
            <li>US stocks and Alpaca-listed crypto currently execute via the Alpaca sandbox (paper) broker.</li>
            <li>Zambian (LuSE) and other African markets, and P2P crypto, are simulated at this stage; a LuSE partnership is in talks and has not been signed.</li>
            <li>PalmCacia is also known as PalmTrader Horizon.</li>
          </ul>
        </section>
      </main>
    </>
  );
};

export default About;
