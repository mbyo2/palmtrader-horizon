
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";

export default function PrivacyPolicy() {
  return (
    <Card className="w-full max-w-4xl mx-auto p-6">
      <ScrollArea className="h-[70vh]">
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">1. Information We Collect</h2>
            <p>We collect information that you provide directly to us, including:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Account information (name, email, etc.)</li>
              <li>Transaction data</li>
              <li>Usage information</li>
              <li>Device and connection information</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide and maintain our services</li>
              <li>Process your transactions</li>
              <li>Send you important updates</li>
              <li>Improve our services</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. Data Protection</h2>
            <p>We implement appropriate technical and organizational measures to protect your personal data against unauthorized or unlawful processing, accidental loss, destruction, or damage.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to processing of your data</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at:</p>
            <p>Email: privacy@palmcasia.com</p>
          </section>

          <footer className="text-sm text-muted-foreground pt-6">
            Last updated: {new Date().toLocaleDateString()}
          </footer>
        </div>
      </ScrollArea>
    </Card>
  );
}
