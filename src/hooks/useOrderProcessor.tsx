
import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { TradingService } from '@/services/TradingService';

export const useOrderProcessor = () => {
  const { user } = useAuth();
  const intervalRef = useRef<number | null>(null);
  
  useEffect(() => {
    // Only run the processor if user is logged in
    if (!user) return;
    
    // Process pending orders initially
    const processPendingOrders = async () => {
      try {
        await TradingService.processPendingOrders(user.id);
      } catch (error) {
        console.error("Error processing pending orders:", error);
      }
    };
    
    processPendingOrders();
    
    // Set up interval to check orders every 60 seconds
    intervalRef.current = window.setInterval(processPendingOrders, 60000);
    
    // Clean up interval on unmount
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user]);
  
  return null;
};
