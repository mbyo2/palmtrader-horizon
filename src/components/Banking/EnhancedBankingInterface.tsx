
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { EnhancedBankingService } from "@/services/EnhancedBankingService";
import { PaymentProcessingService } from "@/services/PaymentProcessingService";
import { KYCService } from "@/services/KYCService";
import { FileUpload, CreditCard, Bank, Shield, DollarSign, Clock } from "lucide-react";

export default function EnhancedBankingInterface() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [accountBalance, setAccountBalance] = useState<any>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [kycStatus, setKycStatus] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>("");

  useEffect(() => {
    if (user) {
      loadBankingData();
    }
  }, [user]);

  const loadBankingData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [balance, methods, txHistory, kyc] = await Promise.all([
        EnhancedBankingService.getAccountBalance(user.id),
        PaymentProcessingService.getPaymentMethods(user.id),
        EnhancedBankingService.getEnhancedTransactionHistory(user.id),
        KYCService.getKYCStatus(user.id)
      ]);

      setAccountBalance(balance);
      setPaymentMethods(methods);
      setTransactions(txHistory);
      setKycStatus(kyc);
    } catch (error) {
      console.error("Error loading banking data:", error);
      toast.error("Failed to load banking data");
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUpload = async () => {
    if (!user || !selectedFile || !documentType) {
      toast.error("Please select a file and document type");
      return;
    }

    setLoading(true);
    try {
      const result = await KYCService.uploadDocument(user.id, selectedFile, documentType as any);
      
      if (result.success) {
        toast.success("Document uploaded successfully");
        setSelectedFile(null);
        setDocumentType("");
        await loadBankingData(); // Refresh KYC status
      } else {
        toast.error(result.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleBankTransfer = async (transferData: any) => {
    if (!user) return;

    setLoading(true);
    try {
      const result = await EnhancedBankingService.processBankTransfer({
        userId: user.id,
        bankAccountId: transferData.bankAccountId,
        amount: parseFloat(transferData.amount),
        direction: transferData.direction,
        transferType: transferData.transferType
      });

      if (result.success) {
        toast.success(`Transfer initiated successfully. Estimated completion: ${new Date(result.estimatedCompletion || '').toLocaleDateString()}`);
        await loadBankingData();
      } else {
        toast.error(result.error || "Transfer failed");
      }
    } catch (error) {
      console.error("Transfer error:", error);
      toast.error("Transfer failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Enhanced Banking</h2>
        <div className="flex gap-2">
          {kycStatus && (
            <Badge variant={kycStatus.verification_level === "premium" ? "default" : "secondary"}>
              KYC: {kycStatus.verification_level}
            </Badge>
          )}
          {accountBalance && (
            <Badge variant="outline">
              Balance: ${accountBalance.available_balance?.toLocaleString() || "0"}
            </Badge>
          )}
        </div>
      </div>

      {/* Account Overview */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${accountBalance?.available_balance?.toLocaleString() || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">
              Pending: ${accountBalance?.pending_balance?.toLocaleString() || "0.00"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verification Level</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {kycStatus?.verification_level || "None"}
            </div>
            <p className="text-xs text-muted-foreground">
              Risk Score: {kycStatus?.risk_score || "N/A"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Methods</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paymentMethods.length}</div>
            <p className="text-xs text-muted-foreground">
              {paymentMethods.filter(pm => pm.is_verified).length} verified
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transfer" className="space-y-6">
        <TabsList>
          <TabsTrigger value="transfer">Transfer Funds</TabsTrigger>
          <TabsTrigger value="kyc">Identity Verification</TabsTrigger>
          <TabsTrigger value="transactions">Transaction History</TabsTrigger>
          <TabsTrigger value="methods">Payment Methods</TabsTrigger>
        </TabsList>

        <TabsContent value="transfer">
          <Card>
            <CardHeader>
              <CardTitle>Enhanced Fund Transfer</CardTitle>
              <CardDescription>
                Transfer funds with multiple options: ACH (free), Wire ($25), or Instant (1.5% fee)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <Input id="amount" type="number" placeholder="0.00" />
                </div>
                <div>
                  <Label htmlFor="direction">Direction</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select direction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deposit">Deposit</SelectItem>
                      <SelectItem value="withdrawal">Withdrawal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="transferType">Transfer Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select transfer type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ach">ACH Transfer (Free, 3 days)</SelectItem>
                    <SelectItem value="wire">Wire Transfer ($25, 1 day)</SelectItem>
                    <SelectItem value="instant">Instant Transfer (1.5%, 15 min)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Transfer limits vary based on your verification level. 
                  {kycStatus?.verification_level === "premium" 
                    ? "Premium: $25,000 daily, $100,000 monthly"
                    : "Current limits apply based on verification level"
                  }
                </AlertDescription>
              </Alert>

              <Button className="w-full" disabled={loading}>
                {loading ? "Processing..." : "Initiate Transfer"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kyc">
          <Card>
            <CardHeader>
              <CardTitle>Identity Verification</CardTitle>
              <CardDescription>
                Upload documents to verify your identity and increase transfer limits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {kycStatus && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <span className="text-sm font-medium">Identity Verified:</span>
                    <Badge variant={kycStatus.identity_verified ? "default" : "secondary"} className="ml-2">
                      {kycStatus.identity_verified ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Address Verified:</span>
                    <Badge variant={kycStatus.address_verified ? "default" : "secondary"} className="ml-2">
                      {kycStatus.address_verified ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-sm font-medium">AML Status:</span>
                    <Badge variant={kycStatus.aml_status === "clear" ? "default" : "destructive"} className="ml-2">
                      {kycStatus.aml_status}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Risk Score:</span>
                    <span className="ml-2 font-mono">{kycStatus.risk_score}/100</span>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="documentType">Document Type</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="drivers_license">Driver's License</SelectItem>
                    <SelectItem value="national_id">National ID</SelectItem>
                    <SelectItem value="proof_of_address">Proof of Address</SelectItem>
                    <SelectItem value="bank_statement">Bank Statement</SelectItem>
                    <SelectItem value="utility_bill">Utility Bill</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="document">Upload Document</Label>
                <Input
                  id="document"
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Supported formats: JPG, PNG, PDF. Max size: 10MB
                </p>
              </div>

              <Button 
                onClick={handleDocumentUpload}
                disabled={!selectedFile || !documentType || loading}
                className="w-full"
              >
                <FileUpload className="w-4 h-4 mr-2" />
                {loading ? "Uploading..." : "Upload Document"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Enhanced Transaction History</CardTitle>
              <CardDescription>
                Categorized transactions with tax relevance indicators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">{tx.description || tx.transaction_type}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString()} • {tx.category}
                        {tx.tax_relevant && <Badge variant="outline" className="ml-2">Tax Relevant</Badge>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-medium ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toLocaleString()}
                      </div>
                      <Badge variant={
                        tx.status === "completed" ? "default" : 
                        tx.status === "failed" ? "destructive" : "secondary"
                      }>
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                
                {transactions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No transactions found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="methods">
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>
                Manage your connected payment methods and bank accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paymentMethods.map((method) => (
                  <div key={method.id} className="flex justify-between items-center p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {method.method_type === "bank_account" ? (
                        <Bank className="h-5 w-5" />
                      ) : (
                        <CreditCard className="h-5 w-5" />
                      )}
                      <div>
                        <div className="font-medium">{method.provider}</div>
                        <div className="text-sm text-muted-foreground">
                          {method.account_mask}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {method.is_verified && (
                        <Badge variant="default">Verified</Badge>
                      )}
                      {method.is_primary && (
                        <Badge variant="outline">Primary</Badge>
                      )}
                    </div>
                  </div>
                ))}
                
                {paymentMethods.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No payment methods found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
