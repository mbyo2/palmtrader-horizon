
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useCommentActions = (onUpdate: () => void) => {
  const [loading, setLoading] = useState(false);

  const addComment = async (content: string) => {
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast.error('Please log in to comment');
        return;
      }

      const { error } = await supabase
        .from('comments')
        .insert({
          content,
          user_id: user.user.id
        });

      if (error) throw error;

      toast.success('Comment added successfully');
      onUpdate();
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      toast.success('Comment deleted successfully');
      onUpdate();
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    } finally {
      setLoading(false);
    }
  };

  return { addComment, deleteComment, loading };
};
