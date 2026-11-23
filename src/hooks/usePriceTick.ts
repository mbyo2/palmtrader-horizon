import { useEffect, useState } from "react";
import { subscribePrices } from "@/services/demo/demoMarket";

/**
 * Re-renders the caller on every demo price-engine tick (2s) so components
 * can read live values straight from demoMarket getters. Returns the tick
 * count. Outside demo mode the engine still ticks in the background once
 * started; callers that need real sources should prefer their own hooks.
 */
export function usePriceTick() {
  const [tick, setTick] = useState(0);
  useEffect(() => subscribePrices(() => setTick((t) => t + 1)), []);
  return tick;
}
