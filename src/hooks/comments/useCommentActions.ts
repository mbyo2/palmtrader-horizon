
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Comment } from "./types";

export const useCommentActions = (
  symbol?: string, 
  loadComments?: () => Promise<void>,
  setComments?: React.Dispatch<React.SetStateAction<Comment[]>>
) => {
  const [loading, setLoading] = useState(false);

  const addComment = async (content: string) => {
    try {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast({
          title: "Please sign in to comment",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("comments").insert({
        content: content.trim(),
        symbol,
        user_id: session.session.user.id,
      });

      if (error) throw error;

      if (loadComments) {
        await loadComments();
      }
      
      toast({
        title: "Comment posted successfully",
      });
    } catch (error) {
      console.error("Error posting comment:", error);
      toast({
        title: "Error posting comment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      if (setComments) {
        setComments(prevComments => prevComments.filter((c) => c.id !== commentId));
      }
      
      toast({
        title: "Comment deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast({
        title: "Error deleting comment",
        variant: "destructive",
      });
    }
  };

  return {
    loading,
    addComment,
    deleteComment
  };
};
