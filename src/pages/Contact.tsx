import { Helmet } from "react-helmet";

const Contact = () => {
  return (
    <>
      <Helmet>
        <title>Contact Palm Cacia — Get Support</title>
        <meta name="description" content="Contact Palm Cacia for support, feedback, or partnership inquiries." />
        <link rel="canonical" href={`${window.location.origin}/contact`} />
      </Helmet>
      <main id="main" className="container py-8 space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Contact</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            We’d love to hear from you. Reach out for support, feedback, or partnerships.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <article className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
            <h2 className="font-semibold mb-2">Support</h2>
            <p className="text-sm text-muted-foreground">Email: support@palmcacia.com</p>
          </article>
          <article className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
            <h2 className="font-semibold mb-2">Partnerships</h2>
            <p className="text-sm text-muted-foreground">Email: partnerships@palmcacia.com</p>
          </article>
        </section>
      </main>
    </>
  );
};

export default Contact;
