import { Helmet } from "react-helmet-async";

const Contact = () => {
  return (
    <>
      <Helmet>
        <title>Contact PalmCacia — Get Support</title>
        <meta name="description" content="Contact PalmCacia for support, feedback, or partnership inquiries." />
        <link rel="canonical" href={`${window.location.origin}/contact`} />
      </Helmet>
      <main id="main" className="container max-w-5xl py-8 space-y-8">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Contact</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Reach out for support, feedback, or partnerships.
          </p>
        </header>

        <section className="grid gap-8 md:grid-cols-2 border-t border-border pt-6">
          <article className="border-t-2 border-primary/70 pt-3">
            <h2 className="font-semibold mb-2">Support</h2>
            <p className="text-sm text-muted-foreground">Email: support@palmcacia.com</p>
          </article>
          <article className="border-t-2 border-primary/70 pt-3">
            <h2 className="font-semibold mb-2">Partnerships</h2>
            <p className="text-sm text-muted-foreground">Email: partnerships@palmcacia.com</p>
          </article>
        </section>
      </main>
    </>
  );
};

export default Contact;
