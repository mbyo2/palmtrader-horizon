import { useState, useRef, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { useHaptic } from "@/hooks/useHaptic";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

const PullToRefresh = ({ onRefresh, children }: PullToRefreshProps) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [hasTriggeredHaptic, setHasTriggeredHaptic] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { trigger } = useHaptic();

  const threshold = 80;
  const maxPull = 120;

  const handleTouchStart = (e: TouchEvent) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (startY === 0 || window.scrollY > 0 || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - startY;

    if (distance > 0) {
      const newDistance = Math.min(distance * 0.5, maxPull);
      setPullDistance(newDistance);
      
      // Trigger haptic feedback when threshold is reached
      if (newDistance >= threshold && !hasTriggeredHaptic) {
        trigger("medium");
        setHasTriggeredHaptic(true);
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold);
      trigger("success");
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
        setHasTriggeredHaptic(false);
      }
    } else {
      setPullDistance(0);
      setHasTriggeredHaptic(false);
    }
    setStartY(0);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: true });
    container.addEventListener("touchend", handleTouchEnd);

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [startY, pullDistance, isRefreshing]);

  const rotation = (pullDistance / threshold) * 360;

  return (
    <div ref={containerRef} className="relative">
      <div
        className="absolute top-0 left-0 right-0 flex justify-center items-center transition-opacity z-50"
        style={{
          height: `${pullDistance}px`,
          opacity: pullDistance > 0 ? 1 : 0,
        }}
      >
        <div className="bg-background/90 backdrop-blur-sm rounded-full p-2 shadow-lg">
          <RefreshCw
            className={`h-5 w-5 text-primary ${isRefreshing ? "animate-spin" : ""}`}
            style={{
              transform: isRefreshing ? undefined : `rotate(${rotation}deg)`,
            }}
          />
        </div>
      </div>
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isRefreshing || pullDistance === 0 ? "transform 0.3s ease" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
