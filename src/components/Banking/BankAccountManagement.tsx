import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Building2, CreditCard } from "lucide-react";

interface BankAccount {
  id: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  branch_code: string | null;
  is_primary: boolean;
}

const BankAccountManagement = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    account_name: "",
    account_number: "",
    bank_name: "",
    branch_code: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchBankAccounts();
  }, []);

  const fetchBankAccounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
      toast({
        title: "Error",
        description: "Failed to load bank accounts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to add a bank account",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("bank_accounts").insert({
        ...formData,
        user_id: user.id,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Bank account added successfully",
      });

      setFormData({
        account_name: "",
        account_number: "",
        bank_name: "",
        branch_code: "",
      });
      setShowForm(false);
      fetchBankAccounts();
    } catch (error) {
      console.error("Error adding bank account:", error);
      toast({
        title: "Error",
        description: "Failed to add bank account",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="p-6 card-gradient">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Bank Accounts
        </h2>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add Account"}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <Input
            placeholder="Account Name"
            value={formData.account_name}
            onChange={(e) =>
              setFormData({ ...formData, account_name: e.target.value })
            }
            required
          />
          <Input
            placeholder="Account Number"
            value={formData.account_number}
            onChange={(e) =>
              setFormData({ ...formData, account_number: e.target.value })
            }
            required
          />
          <Input
            placeholder="Bank Name"
            value={formData.bank_name}
            onChange={(e) =>
              setFormData({ ...formData, bank_name: e.target.value })
            }
            required
          />
          <Input
            placeholder="Branch Code (Optional)"
            value={formData.branch_code}
            onChange={(e) =>
              setFormData({ ...formData, branch_code: e.target.value })
            }
          />
          <Button type="submit" className="w-full">
            Add Bank Account
          </Button>
        </form>
      )}

      <div className="space-y-4">
        {loading ? (
          <p>Loading bank accounts...</p>
        ) : accounts.length === 0 ? (
          <p>No bank accounts linked yet.</p>
        ) : (
          accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between p-4 rounded-lg bg-background/50"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5" />
                <div>
                  <p className="font-medium">{account.bank_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {account.account_name} - ****
                    {account.account_number.slice(-4)}
                  </p>
                </div>
              </div>
              {account.is_primary && (
                <span className="text-sm bg-primary/20 text-primary px-2 py-1 rounded">
                  Primary
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  );
};

export default BankAccountManagement;