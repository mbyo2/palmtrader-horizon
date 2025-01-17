import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, User, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    username: string | null;
  } | null;
}

interface CommentsProps {
  symbol?: string;
}

const Comments = ({ symbol }: CommentsProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

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
      console.log("Loading comments for symbol:", symbol);
      const query = supabase
        .from("comments")
        .select(`
          *,
          profiles:user_id(username)
        `)
        .order("created_at", { ascending: false });

      if (symbol) {
        query.eq("symbol", symbol);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching comments:", error);
        throw error;
      }
      console.log("Fetched comments:", data);
      setComments(data || []);
    } catch (error) {
      console.error("Error loading comments:", error);
      toast({
        title: "Error loading comments",
        variant: "destructive",
      });
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

  return (
    <div className="space-y-4">
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
        {comments.map((comment) => (
          <div
            key={comment.id}
            className="p-4 rounded-lg border border-border/40 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span className="font-medium">
                  {comment.profiles?.username || "Anonymous"}
                </span>
                <span className="text-muted-foreground text-sm">
                  {format(new Date(comment.created_at), "MMM d, yyyy")}
                </span>
              </div>
              {userId === comment.user_id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(comment.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-sm">{comment.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Comments;