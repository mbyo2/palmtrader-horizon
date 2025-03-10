
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useAuthUser = () => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUserId(session?.user?.id || null);
  };

  return { userId };
};
