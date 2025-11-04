import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const usePullToRefresh = () => {
  const queryClient = useQueryClient();

  const handleRefresh = useCallback(async () => {
    try {
      await queryClient.invalidateQueries();
      toast.success("Data refreshed");
    } catch (error) {
      toast.error("Failed to refresh data");
      console.error("Refresh error:", error);
    }
  }, [queryClient]);

  return { handleRefresh };
};
