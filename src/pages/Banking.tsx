
import { Helmet } from "react-helmet";
import BankingDashboard from "@/components/Banking/BankingDashboard";

export default function BankingPage() {
  return (
    <>
      <Helmet>
        <title>Banking - SmartTrade</title>
      </Helmet>
      <div className="container py-8">
        <BankingDashboard />
      </div>
    </>
  );
}
