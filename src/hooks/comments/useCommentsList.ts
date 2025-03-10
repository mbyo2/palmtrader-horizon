
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Comment } from "./types";

export const useCommentsList = (symbol?: string, limit: number = 10) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const loadComments = async () => {
    try {
      setIsInitialLoading(true);
      console.log("Loading comments for symbol:", symbol);
      
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles:user_id(username, avatar_url),
          likes:comment_likes(count)
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error fetching comments:", error);
        throw error;
      }

      let filteredComments = data || [];
      if (symbol) {
        filteredComments = filteredComments.filter(comment => comment.symbol === symbol);
      }
      
      if (limit) {
        filteredComments = filteredComments.slice(0, limit);
      }

      const formattedComments = filteredComments.map(comment => ({
        ...comment,
        likes_count: comment.likes?.length || 0
      }));
      
      setComments(formattedComments);
      
    } catch (error) {
      console.error("Error loading comments:", error);
      toast({
        title: "Error loading comments",
        variant: "destructive",
      });
    } finally {
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [symbol]);

  return {
    comments,
    setComments,
    isInitialLoading,
    loadComments
  };
};
