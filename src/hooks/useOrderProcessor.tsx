
import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { OrderExecutionEngine } from '@/services/OrderExecutionEngine';

export const useOrderProcessor = () => {
  const { user } = useAuth();
  const intervalRef = useRef<number | null>(null);
  
  useEffect(() => {
    if (!user) return;
    
    const processPendingOrders = async () => {
      try {
        await OrderExecutionEngine.processPendingOrders();
      } catch (error) {
        console.error("Error processing pending orders:", error);
      }
    };
    
    // Process immediately, then every 15 seconds for responsive limit/stop fills
    processPendingOrders();
    intervalRef.current = window.setInterval(processPendingOrders, 15000);
    
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user]);
  
  return null;
};
