import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";

const About = () => {
  return (
    <>
      <Helmet>
        <title>About Palm Cacia — Platform Overview</title>
        <meta name="description" content="Learn about Palm Cacia: our mission, features, and the team building a modern investing experience." />
        <link rel="canonical" href={`${window.location.origin}/about`} />
      </Helmet>
      <main id="main" className="container py-8 space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">About Palm Cacia</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            We’re building a seamless investing platform with real-time market data, portfolio tools, and secure trading.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          <article className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
            <h2 className="font-semibold mb-2">Our Mission</h2>
            <p className="text-sm text-muted-foreground">
              Empower investors with accessible, transparent tools to make informed decisions across global markets.
            </p>
          </article>
          <article className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
            <h2 className="font-semibold mb-2">What We Offer</h2>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>Live market data and research</li>
              <li>Portfolio and watchlist management</li>
              <li>Alerts, notifications, and PWA support</li>
            </ul>
          </article>
          <article className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
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
