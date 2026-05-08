import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle } from "lucide-react";
import { AlpacaPaperService } from "@/services/AlpacaPaperService";

interface SellConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  symbol: string;
  side: "buy" | "sell";
  /** Either qty (shares) or notional ($) must be provided */
  qty?: number;
  notional?: number;
  price?: number | null;
  isDemo?: boolean;
  isSubmitting?: boolean;
}

interface PositionInfo {
  qty: number;
  avgPrice: number;
  marketValue: number;
  unrealizedPL: number;
}

const SellConfirmDialog = ({
  open,
  onOpenChange,
  onConfirm,
  symbol,
  side,
  qty,
  notional,
  price,
  isDemo,
  isSubmitting,
}: SellConfirmDialogProps) => {
  const [position, setPosition] = useState<PositionInfo | null>(null);
  const [loadingPos, setLoadingPos] = useState(false);

  useEffect(() => {
    if (!open || !isDemo) {
      setPosition(null);
      return;
    }
    let cancelled = false;
    setLoadingPos(true);
    AlpacaPaperService.getPositions()
      .then((res) => {
        if (cancelled) return;
        const all = (res?.all_positions ?? res?.positions ?? []) as any[];
        const p = all.find((x) => x.symbol?.toUpperCase() === symbol.toUpperCase());
        if (p) {
          setPosition({
            qty: Number(p.qty),
            avgPrice: Number(p.avg_entry_price),
            marketValue: Number(p.market_value),
            unrealizedPL: Number(p.unrealized_pl),
          });
        } else {
          setPosition(null);
        }
      })
      .catch(() => !cancelled && setPosition(null))
      .finally(() => !cancelled && setLoadingPos(false));
    return () => {
      cancelled = true;
    };
  }, [open, symbol, isDemo]);

  const estShares = qty ?? (notional && price ? notional / price : 0);
  const estProceeds = notional ?? (qty && price ? qty * price : 0);
  const insufficient =
    side === "sell" && position !== null && estShares > position.qty + 1e-6;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            Confirm {side === "buy" ? "Buy" : "Sell"} Order
            <Badge variant={side === "buy" ? "default" : "destructive"}>
              {side.toUpperCase()}
            </Badge>
          </AlertDialogTitle>
          <AlertDialogDescription>
            Review the order details before placing.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 text-sm">
          <Row label="Symbol" value={symbol.toUpperCase()} bold />
          <Row label="Side" value={side === "buy" ? "Buy" : "Sell"} />
          {qty != null && <Row label="Quantity" value={`${qty} shares`} />}
          {notional != null && (
            <Row label="Notional" value={`$${notional.toLocaleString()}`} />
          )}
          {price != null && (
            <Row label="Est. Price" value={`$${price.toFixed(2)}`} />
          )}
          {qty != null && price != null && (
            <Row
              label={side === "buy" ? "Est. Cost" : "Est. Proceeds"}
              value={`$${(qty * price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              bold
            />
          )}
          {notional != null && price != null && (
            <Row
              label="Est. Shares"
              value={(notional / price).toFixed(4)}
            />
          )}

          <div className="border-t pt-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Current Position</p>
            {loadingPos ? (
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading position…
              </div>
            ) : position ? (
              <>
                <Row label="Shares Held" value={position.qty.toFixed(4)} />
                <Row label="Avg Entry" value={`$${position.avgPrice.toFixed(2)}`} />
                <Row
                  label="Market Value"
                  value={`$${position.marketValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                />
                <Row
                  label="Unrealized P&L"
                  value={`${position.unrealizedPL >= 0 ? "+" : ""}$${position.unrealizedPL.toFixed(2)}`}
                  className={position.unrealizedPL >= 0 ? "text-success" : "text-destructive"}
                />
              </>
            ) : (
              <p className="text-xs text-muted-foreground">No existing position in {symbol.toUpperCase()}.</p>
            )}
          </div>

          {insufficient && (
            <div className="flex items-start gap-2 p-2 rounded-md bg-destructive/10 text-destructive text-xs">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>
                You only hold {position!.qty.toFixed(4)} shares — sell quantity exceeds your position.
              </span>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isSubmitting || insufficient}
            className={side === "sell" ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : ""}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm {side === "buy" ? "Buy" : "Sell"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const Row = ({
  label,
  value,
  bold,
  className,
}: {
  label: string;
  value: string;
  bold?: boolean;
  className?: string;
}) => (
  <div className="flex justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className={`${bold ? "font-semibold" : ""} ${className ?? ""}`}>{value}</span>
  </div>
);

export default SellConfirmDialog;
