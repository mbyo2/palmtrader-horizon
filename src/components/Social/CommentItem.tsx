
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart, Trash2, MoreVertical } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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

interface CommentItemProps {
  comment: Comment;
  userId: string | null;
  isLiked: boolean;
  onLike: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const CommentItem = ({ comment, userId, isLiked, onLike, onDelete }: CommentItemProps) => {
  const [isLiking, setIsLiking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleLike = async () => {
    setIsLiking(true);
    await onLike(comment.id);
    setIsLiking(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(comment.id);
    setIsDeleting(false);
  };

  const username = comment.profiles?.username || 'Anonymous';
  const isOwner = userId === comment.user_id;

  return (
    <div className="p-4 rounded-lg border border-border/40 bg-card">
      <div className="flex items-start space-x-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">
            {username.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{username}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </p>
            </div>
            
            {isOwner && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="h-8 w-8 p-0"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {comment.content}
          </p>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={isLiking || !userId}
              className={`h-7 px-2 ${isLiked ? 'text-red-500' : 'text-muted-foreground'}`}
            >
              <Heart className={`h-3 w-3 mr-1 ${isLiked ? 'fill-current' : ''}`} />
              <span className="text-xs">{comment.likes_count || 0}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentItem;
