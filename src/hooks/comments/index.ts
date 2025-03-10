
import { useState, useEffect } from "react";
import { useCommentsList } from "./useCommentsList";
import { useCommentActions } from "./useCommentActions";
import { useLikeComment } from "./useLikeComment";
import { useAuthUser } from "./useAuthUser";

export const useComments = (symbol?: string, limit: number = 10) => {
  const { comments, setComments, isInitialLoading, loadComments } = useCommentsList(symbol, limit);
  const { userId } = useAuthUser();
  const { loading, addComment, deleteComment } = useCommentActions(symbol, loadComments, setComments);
  const { likedComments, handleLike } = useLikeComment(userId, comments, setComments);

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

export * from "./types";
