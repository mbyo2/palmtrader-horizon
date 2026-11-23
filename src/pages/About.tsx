import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";

const About = () => {
  return (
    <>
      <Helmet>
        <title>About Palm Cacia — Platform Overview</title>
        <meta name="description" content="Learn about Palm Cacia: our mission, features, and the team building a modern investing experience." />
        <link rel="canonical" href={`${window.location.origin}/about`} />
      </Helmet>
      <main id="main" className="container max-w-5xl py-8 space-y-8">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">About Palm Cacia</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Palm Cacia is a trading terminal for crypto, US stocks and Lusaka Securities Exchange shares, with live prices, portfolio tools and an order book on every market.
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
      </main>
    </>
  );
};

export default About;
