import { Helmet } from "react-helmet-async";
import PrivacyPolicy from "@/components/legal/PrivacyPolicy";

const Privacy = () => {
  return (
    <div className="container py-6">
      <Helmet><title>Privacy Policy — PalmCacia</title><meta name="description" content="PalmCacia Privacy Policy: how we collect, use and protect your data." /><link rel="canonical" href={`${window.location.origin}/privacy`} /></Helmet>
      <PrivacyPolicy />
    </div>
  );
};

export default Privacy;
