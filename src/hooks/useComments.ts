
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  likes_count?: number;
  symbol?: string;
  profiles: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}

export const useComments = (symbol?: string, limit: number = 10) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadComments();
    checkUser();
  }, [symbol]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUserId(session?.user?.id || null);
  };

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
      
      if (userId) {
        const commentIds = formattedComments.map(comment => comment.id);
        checkLikedComments(commentIds);
      }

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

  const checkLikedComments = async (commentIds: string[]) => {
    if (!userId || commentIds.length === 0) return;
    
    try {
      const { data, error } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .eq('user_id', userId)
        .in('comment_id', commentIds);
      
      if (error) {
        console.error("Error checking liked comments:", error);
        return;
      }
      
      const likedSet = new Set(data?.map(like => like.comment_id));
      setLikedComments(likedSet);
    } catch (error) {
      console.error("Error checking liked comments:", error);
    }
  };

  const handleLike = async (commentId: string) => {
    if (!userId) {
      toast({
        title: "Please sign in to like comments",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const isLiked = likedComments.has(commentId);
      const newLikedComments = new Set(likedComments);
      
      if (isLiked) {
        newLikedComments.delete(commentId);
      } else {
        newLikedComments.add(commentId);
      }
      
      setLikedComments(newLikedComments);
      
      setComments(comments.map(comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            likes_count: (comment.likes_count || 0) + (isLiked ? -1 : 1)
          };
        }
        return comment;
      }));
      
      if (isLiked) {
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .eq('user_id', userId)
          .eq('comment_id', commentId);
          
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('comment_likes')
          .insert({
            user_id: userId,
            comment_id: commentId
          });
          
        if (error) throw error;
      }
    } catch (error) {
      console.error("Error liking/unliking comment:", error);
      toast({
        title: "Error processing your action",
        variant: "destructive",
      });
    }
  };

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

      loadComments();
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

      setComments(comments.filter((c) => c.id !== commentId));
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
    comments,
    loading,
    isInitialLoading,
    userId,
    likedComments,
    handleLike,
    addComment,
    deleteComment
  };
};
