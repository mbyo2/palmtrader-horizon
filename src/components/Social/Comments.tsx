
import { useComments } from "@/hooks/useComments";
import CommentForm from "./CommentForm";
import CommentList from "./CommentList";

interface CommentsProps {
  symbol?: string;
  limit?: number;
  showTitle?: boolean;
}

const Comments = ({ symbol, limit = 10, showTitle = true }: CommentsProps) => {
  const {
    comments,
    loading,
    isInitialLoading,
    userId,
    likedComments,
    handleLike,
    addComment,
    deleteComment
  } = useComments(symbol, limit);

  return (
    <div className="space-y-4">
      {showTitle && <h3 className="text-lg font-semibold mb-4">Comments</h3>}
      
      <CommentForm onSubmit={addComment} loading={loading} />

      <CommentList
        comments={comments}
        isLoading={isInitialLoading}
        userId={userId}
        likedComments={likedComments}
        onLike={handleLike}
        onDelete={deleteComment}
        limit={limit}
      />
    </div>
  );
};

export default Comments;
