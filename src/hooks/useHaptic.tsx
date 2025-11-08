import { useCallback } from "react";

type HapticStyle = "light" | "medium" | "heavy" | "selection" | "success" | "warning" | "error";

export const useHaptic = () => {
  const isSupported = useCallback(() => {
    return "vibrate" in navigator || ("hapticEngine" in navigator);
  }, []);

  const trigger = useCallback((style: HapticStyle = "light") => {
    if (!isSupported()) return;

    // iOS Haptic Engine (if available)
    if ("hapticEngine" in navigator && (navigator as any).hapticEngine) {
      try {
        switch (style) {
          case "light":
            (navigator as any).hapticEngine.impact("light");
            break;
          case "medium":
            (navigator as any).hapticEngine.impact("medium");
            break;
          case "heavy":
            (navigator as any).hapticEngine.impact("heavy");
            break;
          case "selection":
            (navigator as any).hapticEngine.selection();
            break;
          case "success":
            (navigator as any).hapticEngine.notification("success");
            break;
          case "warning":
            (navigator as any).hapticEngine.notification("warning");
            break;
          case "error":
            (navigator as any).hapticEngine.notification("error");
            break;
        }
        return;
      } catch (error) {
        console.debug("Haptic engine error:", error);
      }
    }

    // Fallback to Vibration API
    if ("vibrate" in navigator) {
      try {
        switch (style) {
          case "light":
            navigator.vibrate(10);
            break;
          case "medium":
            navigator.vibrate(20);
            break;
          case "heavy":
            navigator.vibrate(40);
            break;
          case "selection":
            navigator.vibrate(5);
            break;
          case "success":
            navigator.vibrate([10, 50, 10]);
            break;
          case "warning":
            navigator.vibrate([20, 50, 20]);
            break;
          case "error":
            navigator.vibrate([30, 50, 30, 50, 30]);
            break;
        }
      } catch (error) {
        console.debug("Vibration error:", error);
      }
    }
  }, [isSupported]);

  return { trigger, isSupported: isSupported() };
};
