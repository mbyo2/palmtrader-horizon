
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Comment } from './types';

export const useCommentsList = (symbol?: string, limit = 10) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchComments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('comments')
        .select(`
          *,
          profiles(username, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (symbol) {
        query = query.eq('symbol', symbol);
      }

      const { data, error } = await query;

      if (error) throw error;

      setComments((data || []) as Comment[]);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  return { comments, loading, fetchComments };
};
