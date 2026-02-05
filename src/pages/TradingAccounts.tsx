import { useState } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AccountTypeSelector from "@/components/Trading/AccountTypeSelector";
import TradingAccountsList from "@/components/Trading/TradingAccountsList";
import { TradingAccountProvider } from "@/hooks/useTradingAccount";
import { TradingAccount } from "@/services/TradingAccountService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";

export default function TradingAccounts() {
  const [activeTab, setActiveTab] = useState("accounts");
  const [selectedAccount, setSelectedAccount] = useState<TradingAccount | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAccountCreated = () => {
    setRefreshKey(prev => prev + 1);
    setActiveTab("accounts");
  };

  const handleSelectAccount = (account: TradingAccount) => {
    setSelectedAccount(account);
  };

  return (
    <>
      <Helmet>
        <title>Trading Accounts | Zambia Stock Trading</title>
        <meta name="description" content="Manage your trading accounts - Demo, Standard, Raw ECN, Pro ECN, and Islamic accounts available" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            {selectedAccount ? (
              <div className="space-y-6">
                <Button 
                  variant="ghost" 
                  onClick={() => setSelectedAccount(null)}
                  className="mb-4"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Accounts
                </Button>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{selectedAccount.account_name || "Trading Account"}</CardTitle>
                        <CardDescription className="font-mono text-lg">{selectedAccount.account_number}</CardDescription>
                      </div>
                      <Badge variant="outline" className="text-lg px-4 py-2">
                        {selectedAccount.account_type.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-muted-foreground">Total Balance</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-3xl font-bold">
                            ${selectedAccount.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-muted-foreground">Available</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-3xl font-bold text-green-500">
                            ${selectedAccount.available_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-muted-foreground">Reserved (Margin)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-3xl font-bold text-amber-500">
                            ${selectedAccount.reserved_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Account Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Leverage</span>
                            <span className="font-medium">1:{selectedAccount.leverage} (Max: 1:{selectedAccount.max_leverage})</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Currency</span>
                            <span className="font-medium">{selectedAccount.currency}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Spread Type</span>
                            <span className="font-medium capitalize">{selectedAccount.spread_type}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Min Spread</span>
                            <span className="font-medium">{selectedAccount.min_spread} pips</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Commission</span>
                            <span className="font-medium">
                              {selectedAccount.commission_per_lot > 0 
                                ? `$${selectedAccount.commission_per_lot}/lot` 
                                : 'None'}
                            </span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Risk Management</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Margin Call Level</span>
                            <span className="font-medium">{selectedAccount.margin_call_level}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Stop Out Level</span>
                            <span className="font-medium">{selectedAccount.stop_out_level}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">SEC Zambia Compliant</span>
                            <span className="font-medium">
                              {selectedAccount.sec_zambia_compliant ? (
                                <Badge variant="outline" className="bg-green-500/10 text-green-500">
                                  <Shield className="h-3 w-3 mr-1" />
                                  Compliant
                                </Badge>
                              ) : (
                                <Badge variant="destructive">Non-Compliant</Badge>
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Account Verified</span>
                            <span className="font-medium">
                              {selectedAccount.is_verified ? 'Yes' : 'Pending'}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {selectedAccount.account_type !== 'demo' && (
                      <div className="flex gap-4">
                        <Button className="flex-1">Deposit Funds</Button>
                        <Button variant="outline" className="flex-1">Withdraw Funds</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <h1 className="text-3xl font-bold mb-2">Trading Accounts</h1>
                  <p className="text-muted-foreground">
                    Manage your trading accounts or open new ones. All accounts comply with Zambia SEC regulations.
                  </p>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-6">
                    <TabsTrigger value="accounts">My Accounts</TabsTrigger>
                    <TabsTrigger value="open">Open New Account</TabsTrigger>
                  </TabsList>

                  <TabsContent value="accounts">
                    <TradingAccountsList 
                      key={refreshKey}
                      onSelectAccount={handleSelectAccount}
                      onOpenNewAccount={() => setActiveTab("open")}
                    />
                  </TabsContent>

                  <TabsContent value="open">
                    <AccountTypeSelector onAccountCreated={handleAccountCreated} />
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
