
import { Helmet } from "react-helmet-async";
import EnhancedBankingInterface from "@/components/Banking/EnhancedBankingInterface";

export default function BankingPage() {
  return (
    <>
      <Helmet>
        <title>Banking - Palm Cacia</title>
      </Helmet>
      <div className="container py-8">
        <EnhancedBankingInterface />
      </div>
    </>
  );
}
