import { Helmet } from "react-helmet";

const Cookies = () => {
  return (
    <>
      <Helmet>
        <title>Cookie Policy — Palm Cacia</title>
        <meta name="description" content="Palm Cacia Cookie Policy: how we use cookies and how you can manage preferences." />
        <link rel="canonical" href={`${window.location.origin}/cookies`} />
      </Helmet>
      <main id="main" className="container py-8 space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Cookie Policy</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">Learn how we use cookies to improve your experience.</p>
        </header>

        <section className="prose prose-neutral dark:prose-invert max-w-none">
          <h2>What Are Cookies</h2>
          <p>Small text files stored on your device to help the site function and analyze usage.</p>
          <h2>How We Use Cookies</h2>
          <ul>
            <li>Essential: sign-in and security</li>
            <li>Performance: analytics and performance</li>
            <li>Preferences: theme and settings</li>
          </ul>
        </section>
      </main>
    </>
  );
};

export default Cookies;
