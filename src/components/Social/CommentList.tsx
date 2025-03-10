
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import CommentItem from "./CommentItem";
import { toast } from "@/components/ui/use-toast";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  likes_count?: number;
  profiles: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface CommentListProps {
  comments: Comment[];
  isLoading: boolean;
  userId: string | null;
  likedComments: Set<string>;
  onLike: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  limit: number;
}

const CommentList = ({
  comments,
  isLoading,
  userId,
  likedComments,
  onLike,
  onDelete,
  limit,
}: CommentListProps) => {
  const handleViewMore = () => {
    toast({
      title: "View more comments",
      description: "Pagination will be implemented soon",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 rounded-lg border border-border/40 space-y-2">
            <div className="flex items-center space-x-2 mb-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div>
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="text-center p-6 border border-dashed border-border rounded-lg">
        <MessageCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-muted-foreground">Be the first to comment!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          userId={userId}
          isLiked={likedComments.has(comment.id)}
          onLike={onLike}
          onDelete={onDelete}
        />
      ))}
      
      {comments.length > 0 && comments.length >= limit && (
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={handleViewMore}
        >
          View More Comments
        </Button>
      )}
    </div>
  );
};

export default CommentList;
