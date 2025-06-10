
import { useState, useEffect } from 'react';
import { useAuthUser } from './useAuthUser';
import { useCommentsList } from './useCommentsList';
import { useCommentActions } from './useCommentActions';
import { useLikeComment } from './useLikeComment';

export const useComments = (symbol?: string, limit = 10) => {
  const { userId } = useAuthUser();
  const { comments, loading: commentsLoading, fetchComments } = useCommentsList(symbol, limit);
  const { addComment, deleteComment, loading: actionsLoading } = useCommentActions(fetchComments);
  const { likedComments, toggleLike } = useLikeComment();
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    const loadInitialData = async () => {
      await fetchComments();
      setIsInitialLoading(false);
    };
    loadInitialData();
  }, [symbol]);

  const handleLike = async (commentId: string) => {
    await toggleLike(commentId);
    await fetchComments(); // Refresh comments to get updated like counts
  };

  return {
    comments,
    loading: actionsLoading,
    isInitialLoading: isInitialLoading || commentsLoading,
    userId,
    likedComments,
    handleLike,
    addComment,
    deleteComment
  };
};

export type { Comment } from './types';
