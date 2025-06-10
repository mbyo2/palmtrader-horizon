
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useLikeComment = () => {
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchUserLikes = async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) return;

        const { data, error } = await supabase
          .from('comment_likes')
          .select('comment_id')
          .eq('user_id', user.user.id);

        if (error) throw error;

        const likedIds = new Set(data?.map(like => like.comment_id) || []);
        setLikedComments(likedIds);
      } catch (error) {
        console.error('Error fetching user likes:', error);
      }
    };

    fetchUserLikes();
  }, []);

  const toggleLike = async (commentId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast.error('Please log in to like comments');
        return;
      }

      const isLiked = likedComments.has(commentId);

      if (isLiked) {
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .eq('user_id', user.user.id)
          .eq('comment_id', commentId);

        if (error) throw error;

        setLikedComments(prev => {
          const newSet = new Set(prev);
          newSet.delete(commentId);
          return newSet;
        });
      } else {
        const { error } = await supabase
          .from('comment_likes')
          .insert({
            user_id: user.user.id,
            comment_id: commentId
          });

        if (error) throw error;

        setLikedComments(prev => new Set([...prev, commentId]));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  return { likedComments, toggleLike };
};
