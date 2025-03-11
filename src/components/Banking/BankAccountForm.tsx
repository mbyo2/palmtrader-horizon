
import { useState } from "react";
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

// Form schema for bank account verification
const bankAccountSchema = z.object({
  accountNumber: z.string().min(8, "Account number must be at least 8 characters"),
  bankName: z.string().min(2, "Bank name is required"),
  accountName: z.string().min(2, "Account name is required"),
});

type BankAccountFormValues = z.infer<typeof bankAccountSchema>;

export default function BankAccountForm() {
  const [isVerifying, setIsVerifying] = useState(false);
  
  const form = useForm<BankAccountFormValues>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      accountNumber: "",
      bankName: "",
      accountName: "",
    },
  });

  // Handle bank account verification
  const onSubmit = async (data: BankAccountFormValues) => {
    setIsVerifying(true);
    
    try {
      // Call the Edge Function to verify the bank account
      const { data: result, error } = await supabase.functions.invoke("banking", {
        body: {
          action: "verifyAccount",
          data: {
            accountNumber: data.accountNumber,
            bankName: data.bankName,
            accountName: data.accountName,
          },
        },
      });

      if (error) throw error;
      
      if (result.verified) {
        // Create bank account record in Supabase
        const { error: insertError } = await supabase
          .from("bank_accounts")
          .insert({
            account_number: data.accountNumber,
            bank_name: data.bankName,
            account_name: data.accountName,
            is_verified: true,
          });

        if (insertError) throw insertError;
        
        toast.success("Bank account verified successfully");
        form.reset();
      } else {
        toast.error("Bank account verification failed");
      }
    } catch (error) {
      console.error("Error verifying bank account:", error);
      toast.error(error instanceof Error ? error.message : "Failed to verify bank account");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Bank Account</CardTitle>
        <CardDescription>
          Link your bank account for deposits and withdrawals
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="bankName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter bank name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="accountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter account number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="accountName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter account name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" disabled={isVerifying} className="w-full">
              {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify Account
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
