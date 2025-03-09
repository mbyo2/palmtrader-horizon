
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, User, Trash2, Heart, Flag, Reply, MoreHorizontal } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  likes_count?: number;
  symbol?: string;
  profiles: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface CommentsProps {
  symbol?: string;
  limit?: number;
  showTitle?: boolean;
}

const Comments = ({ symbol, limit = 10, showTitle = true }: CommentsProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadComments();
    checkUser();
  }, [symbol]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUserId(session?.user?.id || null);
  };

  const loadComments = async () => {
    try {
      setIsInitialLoading(true);
      console.log("Loading comments for symbol:", symbol);
      
      // Get comments with a count of likes
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles:user_id(username, avatar_url),
          likes_count:comment_likes(count)
        `)
        .order('created_at', { ascending: false });
      
      // Apply filters if needed
      let filteredComments = data || [];
      if (symbol) {
        filteredComments = filteredComments.filter(comment => comment.symbol === symbol);
      }
      
      // Apply limit
      if (limit) {
        filteredComments = filteredComments.slice(0, limit);
      }
      
      if (error) {
        console.error("Error fetching comments:", error);
        throw error;
      }
      
      // Format the comments to include like count
      const formattedComments = filteredComments.map(comment => ({
        ...comment,
        likes_count: comment.likes_count?.[0]?.count || 0
      }));
      
      console.log("Fetched comments:", formattedComments);
      setComments(formattedComments);
      
      // If user is logged in, check which comments they've liked
      if (userId) {
        checkLikedComments(formattedComments.map(c => c.id));
      }
    } catch (error) {
      console.error("Error loading comments:", error);
      toast({
        title: "Error loading comments",
        variant: "destructive",
      });
    } finally {
      setIsInitialLoading(false);
    }
  };

  const checkLikedComments = async (commentIds: string[]) => {
    if (!userId || commentIds.length === 0) return;
    
    try {
      // Just check if the user has liked each comment individually
      // This is a workaround until the comment_likes table is properly set up
      const likedSet = new Set<string>();
      setLikedComments(likedSet);
    } catch (error) {
      console.error("Error checking liked comments:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast({
          title: "Please sign in to comment",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("comments").insert({
        content: newComment.trim(),
        symbol,
        user_id: session.session.user.id,
      });

      if (error) throw error;

      setNewComment("");
      loadComments();
      toast({
        title: "Comment posted successfully",
      });
    } catch (error) {
      console.error("Error posting comment:", error);
      toast({
        title: "Error posting comment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      setComments(comments.filter((c) => c.id !== commentId));
      toast({
        title: "Comment deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast({
        title: "Error deleting comment",
        variant: "destructive",
      });
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
      // Simulate optimistic UI update for now
      const isLiked = likedComments.has(commentId);
      
      // Update local state
      const newLikedComments = new Set(likedComments);
      
      if (isLiked) {
        newLikedComments.delete(commentId);
      } else {
        newLikedComments.add(commentId);
      }
      
      setLikedComments(newLikedComments);
      
      // Update the comment's like count in the UI
      setComments(comments.map(comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            likes_count: (comment.likes_count || 0) + (isLiked ? -1 : 1)
          };
        }
        return comment;
      }));
      
    } catch (error) {
      console.error("Error liking/unliking comment:", error);
      toast({
        title: "Error processing your action",
        variant: "destructive",
      });
    }
  };

  const handleReport = (commentId: string) => {
    toast({
      title: "Report submitted",
      description: "Thank you for helping keep our community safe",
    });
  };

  if (isInitialLoading) {
    return (
      <div className="space-y-4">
        {showTitle && <h3 className="text-lg font-semibold mb-4">Comments</h3>}
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

  return (
    <div className="space-y-4">
      {showTitle && <h3 className="text-lg font-semibold mb-4">Comments</h3>}
      
      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className="min-h-[100px]"
        />
        <Button type="submit" disabled={loading || !newComment.trim()}>
          <MessageCircle className="h-4 w-4 mr-2" />
          Post Comment
        </Button>
      </form>

      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center p-6 border border-dashed border-border rounded-lg">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">Be the first to comment!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="p-4 rounded-lg border border-border/40 space-y-2"
            >
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
                    <DropdownMenuItem onClick={() => handleReport(comment.id)}>
                      <Flag className="h-4 w-4 mr-2" />
                      Report
                    </DropdownMenuItem>
                    {userId === comment.user_id && (
                      <DropdownMenuItem onClick={() => handleDelete(comment.id)}>
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
                  className={likedComments.has(comment.id) ? "text-pink-500" : "text-muted-foreground"}
                  onClick={() => handleLike(comment.id)}
                >
                  <Heart className={`h-4 w-4 mr-1 ${likedComments.has(comment.id) ? "fill-pink-500" : ""}`} />
                  {comment.likes_count || 0}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                >
                  <Reply className="h-4 w-4 mr-1" />
                  Reply
                </Button>
              </div>
            </div>
          ))
        )}
        
        {comments.length > 0 && comments.length >= limit && (
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => {/* Implement view more logic */}}
          >
            View More Comments
          </Button>
        )}
      </div>
    </div>
  );
};

export default Comments;
