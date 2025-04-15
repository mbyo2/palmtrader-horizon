
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import BankAccountForm from "./BankAccountForm";
import FundTransferForm from "./FundTransferForm";

type BankAccount = {
  id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  is_primary: boolean;
};

type TransferHistory = {
  id: string;
  amount: number;
  direction: string;
  status: string;
  created_at: string;
  bank_account: {
    bank_name: string;
    account_number: string;
  };
};

export default function BankingDashboard() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [transferHistory, setTransferHistory] = useState<TransferHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBankingData = async () => {
      setIsLoading(true);
      
      try {
        // Fetch bank accounts
        const { data: accountsData, error: accountsError } = await supabase
          .from("bank_accounts")
          .select("id, bank_name, account_number, account_name, is_primary");
        
        if (accountsError) throw accountsError;
        
        // Fetch transfer history
        const { data: transfersData, error: transfersError } = await supabase
          .from("fund_transfers")
          .select(`
            id, amount, direction, status, created_at,
            bank_accounts:bank_account_id (bank_name, account_number)
          `)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (transfersError) throw transfersError;
        
        setBankAccounts(accountsData || []);
        
        // Transform the data to match the TransferHistory type
        const formattedTransfers = (transfersData || []).map((transfer: any) => ({
          id: transfer.id,
          amount: transfer.amount,
          direction: transfer.direction,
          status: transfer.status,
          created_at: transfer.created_at,
          bank_account: {
            bank_name: transfer.bank_accounts?.bank_name,
            account_number: transfer.bank_accounts?.account_number
          }
        }));
        
        setTransferHistory(formattedTransfers);
      } catch (error) {
        console.error("Error fetching banking data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBankingData();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Banking</h2>
      <p className="text-muted-foreground">
        Manage your bank accounts and transfer funds to and from your trading account.
      </p>
      
      <div className="grid gap-6 md:grid-cols-2">
        <BankAccountForm />
        <FundTransferForm />
      </div>
      
      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">Bank Accounts</TabsTrigger>
          <TabsTrigger value="history">Transfer History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="accounts">
          {isLoading ? (
            <div className="text-center py-8">Loading bank accounts...</div>
          ) : bankAccounts.length === 0 ? (
            <div className="text-center py-8">
              <p>No bank accounts found.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Add your first bank account to enable deposits and withdrawals.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {bankAccounts.map((account) => (
                <Card key={account.id}>
                  <CardHeader>
                    <CardTitle>{account.bank_name}</CardTitle>
                    <CardDescription>
                      {account.is_primary && "Primary Account"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Account Number</span>
                        <span>
                          {account.account_number.replace(/(\d{4})/g, "$1 ").trim()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Account Name</span>
                        <span>{account.account_name}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="history">
          {isLoading ? (
            <div className="text-center py-8">Loading transfer history...</div>
          ) : transferHistory.length === 0 ? (
            <div className="text-center py-8">
              <p>No transfer history found.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Your deposit and withdrawal history will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {transferHistory.map((transfer) => (
                <Card key={transfer.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {transfer.direction === "deposit" ? "Deposit" : "Withdrawal"}
                        </CardTitle>
                        <CardDescription>
                          {new Date(transfer.created_at).toLocaleDateString()} at{" "}
                          {new Date(transfer.created_at).toLocaleTimeString()}
                        </CardDescription>
                      </div>
                      <div className={transfer.direction === "deposit" ? "text-green-500" : "text-red-500"}>
                        {transfer.direction === "deposit" ? "+" : "-"}${transfer.amount.toFixed(2)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Status: </span>
                      <span className="capitalize font-medium">{transfer.status}</span>
                    </div>
                    <div className="text-sm mt-1">
                      <span className="text-muted-foreground">Bank Account: </span>
                      <span>{transfer.bank_account?.bank_name} - {transfer.bank_account?.account_number}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
