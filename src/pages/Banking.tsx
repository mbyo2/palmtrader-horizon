
import { Helmet } from "react-helmet";
import EnhancedBankingInterface from "@/components/Banking/EnhancedBankingInterface";

export default function BankingPage() {
  return (
    <>
      <Helmet>
        <title>Banking - SmartTrade</title>
      </Helmet>
      <div className="container py-8">
        <EnhancedBankingInterface />
      </div>
    </>
  );
}
