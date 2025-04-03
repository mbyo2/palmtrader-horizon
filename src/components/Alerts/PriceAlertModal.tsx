
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PriceAlertForm } from './PriceAlertForm';
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface PriceAlertModalProps {
  symbol: string;
  currentPrice: number;
  children?: React.ReactNode;
}

const PriceAlertModal = ({ 
  symbol, 
  currentPrice, 
  children 
}: PriceAlertModalProps) => {
  const [open, setOpen] = React.useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <>
      <div onClick={handleOpen}>
        {children || (
          <Button variant="outline" size="sm" className="text-xs flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Set Alert
          </Button>
        )}
      </div>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Set Price Alert for {symbol}</DialogTitle>
          </DialogHeader>
          <PriceAlertForm symbol={symbol} currentPrice={currentPrice} />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PriceAlertModal;
