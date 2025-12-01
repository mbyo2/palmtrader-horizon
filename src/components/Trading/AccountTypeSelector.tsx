import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TradingAccountService, AccountTypeConfig, TradingAccountType } from "@/services/TradingAccountService";
import { Check, DollarSign, Percent, Zap, Shield, Star, Moon } from "lucide-react";
import { toast } from "sonner";

interface AccountTypeSelectorProps {
  onAccountCreated?: () => void;
}

export default function AccountTypeSelector({ onAccountCreated }: AccountTypeSelectorProps) {
  const [configs, setConfigs] = useState<AccountTypeConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<TradingAccountType | null>(null);
  const [accountName, setAccountName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [initialDeposit, setInitialDeposit] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    const data = await TradingAccountService.getAccountTypeConfigs();
    setConfigs(data);
  };

  const getIcon = (type: TradingAccountType) => {
    const icons: Record<TradingAccountType, React.ReactNode> = {
      demo: <Shield className="h-6 w-6" />,
      cent: <DollarSign className="h-6 w-6" />,
      standard_stp: <Zap className="h-6 w-6" />,
      raw_ecn: <Percent className="h-6 w-6" />,
      pro_ecn: <Star className="h-6 w-6" />,
      islamic: <Moon className="h-6 w-6" />
    };
    return icons[type] || <Shield className="h-6 w-6" />;
  };

  const getCardStyle = (type: TradingAccountType) => {
    const styles: Record<TradingAccountType, string> = {
      demo: "border-muted-foreground/30 hover:border-muted-foreground/50",
      cent: "border-green-500/30 hover:border-green-500/50",
      standard_stp: "border-blue-500/30 hover:border-blue-500/50",
      raw_ecn: "border-purple-500/30 hover:border-purple-500/50",
      pro_ecn: "border-amber-500/30 hover:border-amber-500/50 ring-1 ring-amber-500/20",
      islamic: "border-emerald-500/30 hover:border-emerald-500/50"
    };
    return styles[type] || styles.demo;
  };

  const handleSelectType = (config: AccountTypeConfig) => {
    setSelectedType(config.account_type);
    setAccountName(config.display_name);
    setInitialDeposit(config.min_deposit > 0 ? config.min_deposit.toString() : "");
    setIsDialogOpen(true);
  };

  const handleCreateAccount = async () => {
    if (!selectedType) return;

    setIsLoading(true);
    try {
      const deposit = selectedType === 'demo' ? 0 : parseFloat(initialDeposit) || 0;
      await TradingAccountService.createAccount(selectedType, currency, accountName, deposit);
      toast.success("Trading account created successfully!");
      setIsDialogOpen(false);
      setSelectedType(null);
      setAccountName("");
      setInitialDeposit("");
      onAccountCreated?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedConfig = configs.find(c => c.account_type === selectedType);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Choose Account Type</h2>
        <p className="text-muted-foreground">
          Select the trading account that best fits your needs. Compliant with Zambia SEC regulations.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {configs.map((config) => (
          <Card 
            key={config.id} 
            className={`cursor-pointer transition-all ${getCardStyle(config.account_type)}`}
            onClick={() => handleSelectType(config)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  {getIcon(config.account_type)}
                </div>
                {config.account_type === 'pro_ecn' && (
                  <Badge variant="default" className="bg-amber-500">Popular</Badge>
                )}
                {config.is_swap_free && (
                  <Badge variant="outline">Swap-Free</Badge>
                )}
              </div>
              <CardTitle className="mt-4">{config.display_name}</CardTitle>
              <CardDescription>{config.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Min Deposit</p>
                  <p className="font-semibold">
                    {config.min_deposit === 0 ? 'Free' : `$${config.min_deposit.toLocaleString()}`}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Leverage</p>
                  <p className="font-semibold">Up to 1:{config.max_leverage}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Spreads</p>
                  <p className="font-semibold">From {config.min_spread} pips</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Commission</p>
                  <p className="font-semibold">
                    {config.commission_per_lot === 0 ? 'None' : `$${config.commission_per_lot}/lot`}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Features:</p>
                <ul className="space-y-1">
                  {config.features.slice(0, 3).map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-3 w-3 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <Button className="w-full" variant={config.account_type === 'pro_ecn' ? 'default' : 'outline'}>
                Open {config.display_name}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open {selectedConfig?.display_name}</DialogTitle>
            <DialogDescription>
              Configure your new trading account
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Account Name</Label>
              <Input
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="My Trading Account"
              />
            </div>

            <div className="space-y-2">
              <Label>Base Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  <SelectItem value="ZMW">ZMW - Zambian Kwacha</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedType !== 'demo' && (
              <div className="space-y-2">
                <Label>Initial Deposit</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    value={initialDeposit}
                    onChange={(e) => setInitialDeposit(e.target.value)}
                    placeholder={selectedConfig?.min_deposit.toString()}
                    className="pl-7"
                    min={selectedConfig?.min_deposit}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Minimum: ${selectedConfig?.min_deposit.toLocaleString()}
                </p>
              </div>
            )}

            {selectedConfig && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm font-medium">Account Details</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Execution:</span>
                    <span className="ml-2 font-medium">{selectedConfig.execution_type}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Max Leverage:</span>
                    <span className="ml-2 font-medium">1:{selectedConfig.max_leverage}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedConfig.requirements}
                </p>
              </div>
            )}

            <Button 
              onClick={handleCreateAccount} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Creating..." : "Create Account"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
