import { Helmet } from "react-helmet";

const Terms = () => {
  return (
    <>
      <Helmet>
        <title>Terms of Service — Palm Cacia</title>
        <meta name="description" content="Palm Cacia Terms of Service: user obligations, acceptable use, and legal terms." />
        <link rel="canonical" href={`${window.location.origin}/terms`} />
      </Helmet>
      <main id="main" className="container py-8 space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">Please review these terms carefully.</p>
        </header>

        <section className="prose prose-neutral dark:prose-invert max-w-none">
          <h2>Use of Service</h2>
          <p>By using Palm Cacia, you agree to comply with applicable laws and platform policies.</p>
          <h2>Accounts</h2>
          <p>You are responsible for maintaining the confidentiality of your account credentials.</p>
          <h2>Liability</h2>
          <p>Market data and analysis are provided for informational purposes only and are not financial advice.</p>
        </section>
      </main>
    </>
  );
};

export default Terms;
