
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Comment } from "./types";

export const useLikeComment = (
  userId: string | null,
  comments: Comment[],
  setComments: React.Dispatch<React.SetStateAction<Comment[]>>
) => {
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (userId && comments.length > 0) {
      const commentIds = comments.map(comment => comment.id);
      checkLikedComments(commentIds);
    }
  }, [userId, comments]);

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

  return {
    likedComments,
    handleLike
  };
};
