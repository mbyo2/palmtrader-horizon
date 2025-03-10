
import { format } from "date-fns";
import { User, Heart, Flag, Reply, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CommentItemProps {
  comment: {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    likes_count?: number;
    profiles: {
      username: string | null;
      avatar_url: string | null;
    } | null;
  };
  userId: string | null;
  isLiked: boolean;
  onLike: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const CommentItem = ({ comment, userId, isLiked, onLike, onDelete }: CommentItemProps) => {
  const handleReport = () => {
    toast({
      title: "Report submitted",
      description: "Thank you for helping keep our community safe",
    });
  };

  const handleReply = () => {
    toast({
      title: "Reply functionality",
      description: "Comment replies will be implemented soon",
    });
  };

  return (
    <div className="p-4 rounded-lg border border-border/40 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={comment.profiles?.avatar_url || undefined} alt="User" />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div>
            <span className="font-medium">
              {comment.profiles?.username || "Anonymous"}
            </span>
            <p className="text-muted-foreground text-xs">
              {format(new Date(comment.created_at), "MMM d, yyyy")}
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleReport}>
              <Flag className="h-4 w-4 mr-2" />
              Report
            </DropdownMenuItem>
            {userId === comment.user_id && (
              <DropdownMenuItem onClick={() => onDelete(comment.id)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="py-2">{comment.content}</p>

      <div className="flex items-center space-x-2 pt-1">
        <Button
          variant="ghost"
          size="sm"
          className={isLiked ? "text-pink-500" : "text-muted-foreground"}
          onClick={() => onLike(comment.id)}
        >
          <Heart className={`h-4 w-4 mr-1 ${isLiked ? "fill-pink-500" : ""}`} />
          {comment.likes_count || 0}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={handleReply}
        >
          <Reply className="h-4 w-4 mr-1" />
          Reply
        </Button>
      </div>
    </div>
  );
};

export default CommentItem;
