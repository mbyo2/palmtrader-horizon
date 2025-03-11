
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Form schema for fund transfers
const fundTransferSchema = z.object({
  amount: z.string().min(1, "Amount is required")
    .refine((val) => !isNaN(Number(val)), "Amount must be a number")
    .refine((val) => Number(val) > 0, "Amount must be greater than zero"),
  bankAccountId: z.string().min(1, "Please select a bank account"),
});

type FundTransferFormValues = z.infer<typeof fundTransferSchema>;
type BankAccount = {
  id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
};

export default function FundTransferForm() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [activeTab, setActiveTab] = useState<"deposit" | "withdrawal">("deposit");
  
  const form = useForm<FundTransferFormValues>({
    resolver: zodResolver(fundTransferSchema),
    defaultValues: {
      amount: "",
      bankAccountId: "",
    },
  });

  // Fetch user's bank accounts
  useEffect(() => {
    const fetchBankAccounts = async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("id, bank_name, account_number, account_name")
        .eq("is_verified", true);
      
      if (error) {
        console.error("Error fetching bank accounts:", error);
        toast.error("Failed to load bank accounts");
        return;
      }
      
      setBankAccounts(data || []);
    };
    
    fetchBankAccounts();
  }, []);

  // Handle fund transfer (deposit or withdrawal)
  const onSubmit = async (data: FundTransferFormValues) => {
    setIsProcessing(true);
    
    try {
      // Call the Edge Function to process the transfer
      const { data: result, error } = await supabase.functions.invoke("banking", {
        body: {
          action: "processTransfer",
          data: {
            amount: Number(data.amount),
            bankAccountId: data.bankAccountId,
            direction: activeTab,  // "deposit" or "withdrawal"
          },
        },
      });

      if (error) throw error;
      
      // Handle success
      toast.success(`${activeTab === "deposit" ? "Deposit" : "Withdrawal"} initiated successfully`);
      form.reset();
    } catch (error) {
      console.error(`Error processing ${activeTab}:`, error);
      toast.error(error instanceof Error ? error.message : `Failed to process ${activeTab}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fund Transfers</CardTitle>
        <CardDescription>
          Deposit funds to or withdraw from your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "deposit" | "withdrawal")}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="deposit">Deposit</TabsTrigger>
            <TabsTrigger value="withdrawal">Withdrawal</TabsTrigger>
          </TabsList>
          
          <TabsContent value="deposit">
            <Alert className="mb-4">
              <AlertDescription>
                Deposits are processed within 1-2 business days.
              </AlertDescription>
            </Alert>
          </TabsContent>
          
          <TabsContent value="withdrawal">
            <Alert className="mb-4">
              <AlertDescription>
                Withdrawals are processed within 1-3 business days.
              </AlertDescription>
            </Alert>
          </TabsContent>
          
          {bankAccounts.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground">No verified bank accounts found.</p>
              <p className="text-sm mt-2">Please add and verify a bank account first.</p>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="bankAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Bank Account</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select bank account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {bankAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.bank_name} - {account.account_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0.01" 
                          step="0.01" 
                          placeholder="Enter amount" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" disabled={isProcessing} className="w-full">
                  {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {activeTab === "deposit" ? "Deposit Funds" : "Withdraw Funds"}
                </Button>
              </form>
            </Form>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
