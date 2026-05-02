import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CryptoOnchainService, type CryptoNetwork } from "@/services/CryptoOnchainService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, Loader2, RefreshCw } from "lucide-react";

const ASSETS: Array<{ currency: string; network: CryptoNetwork; label: string }> = [
  { currency: "BTC", network: "BITCOIN", label: "Bitcoin (BTC)" },
  { currency: "ETH", network: "ETHEREUM", label: "Ethereum (ETH)" },
  { currency: "USDT", network: "ERC20", label: "USDT (ERC20)" },
  { currency: "USDT", network: "TRC20", label: "USDT (TRC20)" },
  { currency: "SOL", network: "SOLANA", label: "Solana (SOL)" },
  { currency: "TRX", network: "TRC20", label: "Tron (TRX)" },
  { currency: "BNB", network: "BSC", label: "BNB (BSC)" },
];

const CryptoOnchainPanel = () => {
  const [selected, setSelected] = useState(0);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [withdrawTo, setWithdrawTo] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const asset = ASSETS[selected];

  const loadAddress = async () => {
    setLoading(true);
    setAddress(null);
    setBalance(null);
    try {
      const r = await CryptoOnchainService.generateAddress(asset.currency, asset.network);
      setAddress(r.address);
      const b = await CryptoOnchainService.getBalance(asset.currency, asset.network);
      setBalance(b.balance);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load wallet");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const copy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    toast.success("Address copied");
  };

  const submitWithdraw = async () => {
    if (!withdrawTo || !withdrawAmount) {
      toast.error("Enter destination and amount");
      return;
    }
    setSubmitting(true);
    try {
      await CryptoOnchainService.requestWithdrawal(
        asset.currency,
        asset.network,
        withdrawTo,
        withdrawAmount,
      );
      toast.success("Withdrawal request submitted for review");
      setWithdrawTo("");
      setWithdrawAmount("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Withdrawal failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>On-chain Crypto Wallet</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Asset</Label>
          <Select value={String(selected)} onValueChange={(v) => setSelected(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ASSETS.map((a, i) => (
                <SelectItem key={i} value={String(i)}>{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="deposit">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="deposit">Deposit</TabsTrigger>
            <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
          </TabsList>

          <TabsContent value="deposit" className="space-y-4 pt-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : address ? (
              <div className="flex flex-col items-center gap-4">
                <div className="bg-white p-3 rounded">
                  <QRCodeSVG value={address} size={180} />
                </div>
                <div className="w-full">
                  <Label className="text-xs text-muted-foreground">Your {asset.label} address</Label>
                  <div className="flex gap-2 mt-1">
                    <Input value={address} readOnly className="font-mono text-xs" />
                    <Button size="icon" variant="outline" onClick={copy}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="w-full flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">On-chain balance</span>
                  <span className="font-mono">{balance ?? "—"} {asset.currency}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={loadAddress}>
                  <RefreshCw className="h-3 w-3 mr-2" /> Refresh
                </Button>
              </div>
            ) : (
              <Button onClick={loadAddress} className="w-full">Generate address</Button>
            )}
            <p className="text-xs text-muted-foreground">
              Send only {asset.label} to this address. Sending any other asset will result in permanent loss.
            </p>
          </TabsContent>

          <TabsContent value="withdraw" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Destination address</Label>
              <Input
                value={withdrawTo}
                onChange={(e) => setWithdrawTo(e.target.value)}
                placeholder={`${asset.label} address`}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                step="any"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <Button onClick={submitWithdraw} disabled={submitting} className="w-full">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Request withdrawal
            </Button>
            <p className="text-xs text-muted-foreground">
              Withdrawals are reviewed for compliance before being broadcast on-chain.
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CryptoOnchainPanel;
