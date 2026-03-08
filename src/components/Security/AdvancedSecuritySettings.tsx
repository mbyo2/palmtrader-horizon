import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Key, Wallet, Eye, EyeOff, Copy, Trash2, Plus, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ApiKeyService, ApiKey } from "@/services/ApiKeyService";
import { WithdrawalWhitelistService, WhitelistAddress } from "@/services/WithdrawalWhitelistService";
import { FeeTierService, FeeTier } from "@/services/FeeTierService";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const AdvancedSecuritySettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Anti-phishing
  const [antiPhishingCode, setAntiPhishingCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [whitelistEnabled, setWhitelistEnabled] = useState(false);

  // API key creation
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyPerms, setNewKeyPerms] = useState<string[]>(["read"]);
  const [createdSecret, setCreatedSecret] = useState<{ apiKey: string; apiSecret: string } | null>(null);

  // Whitelist
  const [newAddress, setNewAddress] = useState({ address_label: "", currency: "BTC", address: "", network: "" });

  const { data: apiKeys = [] } = useQuery({
    queryKey: ["api-keys", user?.id],
    queryFn: () => user ? ApiKeyService.getApiKeys(user.id) : [],
    enabled: !!user,
  });

  const { data: whitelist = [] } = useQuery({
    queryKey: ["whitelist", user?.id],
    queryFn: () => user ? WithdrawalWhitelistService.getWhitelist(user.id) : [],
    enabled: !!user,
  });

  const { data: feeTiers = [] } = useQuery({
    queryKey: ["fee-tiers"],
    queryFn: FeeTierService.getFeeTiers,
  });

  const { data: userVolume } = useQuery({
    queryKey: ["user-volume", user?.id],
    queryFn: () => user ? FeeTierService.getUserVolume(user.id) : null,
    enabled: !!user,
  });

  useEffect(() => {
    if (user) {
      WithdrawalWhitelistService.getAntiPhishingCode(user.id).then(code => {
        if (code) setAntiPhishingCode(code);
      });
    }
  }, [user]);

  const createKeyMutation = useMutation({
    mutationFn: () => user ? ApiKeyService.createApiKey(user.id, newKeyName, newKeyPerms) : Promise.reject(),
    onSuccess: (result) => {
      setCreatedSecret(result);
      setNewKeyName("");
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key created! Save the secret — it won't be shown again.");
    },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: (id: string) => ApiKeyService.deleteApiKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key deleted");
    },
  });

  const addAddressMutation = useMutation({
    mutationFn: () => user ? WithdrawalWhitelistService.addAddress(user.id, newAddress) : Promise.reject(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whitelist"] });
      setNewAddress({ address_label: "", currency: "BTC", address: "", network: "" });
      toast.success("Address added to whitelist");
    },
  });

  const removeAddressMutation = useMutation({
    mutationFn: (id: string) => WithdrawalWhitelistService.removeAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whitelist"] });
      toast.success("Address removed");
    },
  });

  const handleSaveAntiPhishing = async () => {
    if (!user || !antiPhishingCode.trim()) return;
    try {
      await WithdrawalWhitelistService.setAntiPhishingCode(user.id, antiPhishingCode);
      toast.success("Anti-phishing code saved");
    } catch {
      toast.error("Failed to save code");
    }
  };

  return (
    <Tabs defaultValue="api-keys" className="space-y-4">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="api-keys">API Keys</TabsTrigger>
        <TabsTrigger value="whitelist">Whitelist</TabsTrigger>
        <TabsTrigger value="anti-phishing">Anti-Phishing</TabsTrigger>
        <TabsTrigger value="fee-tiers">VIP Tiers</TabsTrigger>
      </TabsList>

      {/* API KEYS */}
      <TabsContent value="api-keys" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" /> API Keys</CardTitle>
            <CardDescription>Create API keys for algorithmic trading bots</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {createdSecret && (
              <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4 space-y-2">
                <div className="flex items-center gap-2 text-yellow-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-semibold text-sm">Save these credentials — the secret won't be shown again!</span>
                </div>
                <div className="space-y-1 text-sm font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Key:</span>
                    <code className="bg-muted px-2 py-0.5 rounded">{createdSecret.apiKey}</code>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(createdSecret.apiKey); toast.success("Copied"); }}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Secret:</span>
                    <code className="bg-muted px-2 py-0.5 rounded">{createdSecret.apiSecret}</code>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(createdSecret.apiSecret); toast.success("Copied"); }}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setCreatedSecret(null)}>Dismiss</Button>
              </div>
            )}

            <div className="flex gap-2">
              <Input placeholder="Key name (e.g. Trading Bot)" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} className="flex-1" />
              <div className="flex gap-1">
                {["read", "trade", "withdraw"].map(p => (
                  <Badge
                    key={p}
                    variant={newKeyPerms.includes(p) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setNewKeyPerms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                  >
                    {p}
                  </Badge>
                ))}
              </div>
              <Button onClick={() => createKeyMutation.mutate()} disabled={!newKeyName.trim() || createKeyMutation.isPending}>
                <Plus className="h-4 w-4 mr-1" /> Create
              </Button>
            </div>

            <div className="space-y-2">
              {apiKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="font-medium text-sm">{key.key_name}</div>
                    <code className="text-xs text-muted-foreground">{key.api_key.slice(0, 12)}...</code>
                    <div className="flex gap-1 mt-1">
                      {key.permissions.map(p => <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={key.is_active ? "default" : "destructive"}>
                      {key.is_active ? "Active" : "Disabled"}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => deleteKeyMutation.mutate(key.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              {apiKeys.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No API keys created yet</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">API Documentation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs font-mono space-y-2 bg-muted p-3 rounded-lg">
              <p className="text-muted-foreground"># Base URL</p>
              <p>https://hvrcchjbqumlknaboczh.supabase.co/functions/v1/trading-api</p>
              <p className="text-muted-foreground mt-2"># Headers</p>
              <p>x-api-key: your_api_key</p>
              <p>x-api-secret: your_api_secret</p>
              <p className="text-muted-foreground mt-2"># Endpoints</p>
              <p>GET /pairs — List trading pairs</p>
              <p>GET /orderbook?pair_id=... — Order book</p>
              <p>GET /orders — Your open orders</p>
              <p>POST /order — Place order</p>
              <p>DELETE /order?order_id=... — Cancel order</p>
              <p>GET /fee-tiers — Fee schedule</p>
              <p>GET /account — Account & volume info</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* WITHDRAWAL WHITELIST */}
      <TabsContent value="whitelist" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> Withdrawal Whitelist</CardTitle>
            <CardDescription>Only allow withdrawals to pre-approved addresses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Enable whitelist-only withdrawals</Label>
              <Switch checked={whitelistEnabled} onCheckedChange={(v) => { setWhitelistEnabled(v); user && WithdrawalWhitelistService.toggleWhitelistEnabled(user.id, v); }} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Label (e.g. My Binance)" value={newAddress.address_label} onChange={e => setNewAddress(p => ({ ...p, address_label: e.target.value }))} />
              <Input placeholder="Currency (BTC, ETH...)" value={newAddress.currency} onChange={e => setNewAddress(p => ({ ...p, currency: e.target.value }))} />
              <Input placeholder="Address" value={newAddress.address} onChange={e => setNewAddress(p => ({ ...p, address: e.target.value }))} className="col-span-2" />
              <Input placeholder="Network (optional)" value={newAddress.network} onChange={e => setNewAddress(p => ({ ...p, network: e.target.value }))} />
              <Button onClick={() => addAddressMutation.mutate()} disabled={!newAddress.address || !newAddress.address_label}>
                <Plus className="h-4 w-4 mr-1" /> Add Address
              </Button>
            </div>

            <div className="space-y-2">
              {whitelist.map((addr) => (
                <div key={addr.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="font-medium text-sm">{addr.address_label}</div>
                    <code className="text-xs text-muted-foreground">{addr.address.slice(0, 8)}...{addr.address.slice(-6)}</code>
                    <Badge variant="secondary" className="ml-2 text-xs">{addr.currency}</Badge>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeAddressMutation.mutate(addr.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ANTI-PHISHING */}
      <TabsContent value="anti-phishing">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Anti-Phishing Code</CardTitle>
            <CardDescription>Set a unique code that will appear in all official emails from PalmCacia. If you don't see this code, the email is fake.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showCode ? "text" : "password"}
                  placeholder="Enter your anti-phishing code"
                  value={antiPhishingCode}
                  onChange={e => setAntiPhishingCode(e.target.value)}
                />
                <Button variant="ghost" size="icon" className="absolute right-0 top-0" onClick={() => setShowCode(!showCode)}>
                  {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button onClick={handleSaveAntiPhishing}>Save</Button>
            </div>
            <p className="text-xs text-muted-foreground">This code will be included in every email we send you. If an email claims to be from PalmCacia but doesn't contain your code, it's a phishing attempt.</p>
          </CardContent>
        </Card>
      </TabsContent>

      {/* VIP FEE TIERS */}
      <TabsContent value="fee-tiers">
        <Card>
          <CardHeader>
            <CardTitle>VIP Fee Tiers</CardTitle>
            <CardDescription>
              Your 30-day volume: <span className="font-bold text-foreground">${(userVolume?.volume_30d || 0).toLocaleString()}</span>
              {userVolume?.current_tier && (
                <Badge className="ml-2">{userVolume.current_tier.tier_name}</Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Tier</th>
                    <th className="text-right py-2">30d Volume</th>
                    <th className="text-right py-2">Maker Fee</th>
                    <th className="text-right py-2">Taker Fee</th>
                    <th className="text-right py-2">Daily Limit</th>
                    <th className="text-right py-2">API Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {feeTiers.map(tier => {
                    const isCurrent = userVolume?.current_tier?.id === tier.id;
                    return (
                      <tr key={tier.id} className={`border-b ${isCurrent ? 'bg-primary/10' : ''}`}>
                        <td className="py-2 font-medium">
                          {tier.tier_name}
                          {isCurrent && <Badge variant="secondary" className="ml-1 text-xs">Current</Badge>}
                        </td>
                        <td className="text-right py-2">${tier.min_30d_volume.toLocaleString()}</td>
                        <td className="text-right py-2">{(tier.maker_fee * 100).toFixed(2)}%</td>
                        <td className="text-right py-2">{(tier.taker_fee * 100).toFixed(2)}%</td>
                        <td className="text-right py-2">${tier.withdrawal_limit_daily.toLocaleString()}</td>
                        <td className="text-right py-2">{tier.api_rate_limit}/min</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default AdvancedSecuritySettings;
