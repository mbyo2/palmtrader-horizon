import { Bell } from "lucide-react";
import PriceAlertList from "@/components/Alerts/PriceAlertList";
import PriceAlertForm from "@/components/Alerts/PriceAlertForm";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";

const Alerts = () => {
  const { isLoading } = useProtectedRoute();

  if (isLoading) {
    return <div className="container py-6">Loading...</div>;
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center space-x-3">
        <Bell className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Price Alerts</h1>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PriceAlertForm />
        <PriceAlertList />
      </div>
    </div>
  );
};

export default Alerts;
