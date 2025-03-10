
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle } from "lucide-react";

interface CommentFormProps {
  onSubmit: (content: string) => Promise<void>;
  loading: boolean;
}

const CommentForm = ({ onSubmit, loading }: CommentFormProps) => {
  const [content, setContent] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    await onSubmit(content);
    setContent("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write a comment..."
        className="min-h-[100px]"
      />
      <Button type="submit" disabled={loading || !content.trim()}>
        <MessageCircle className="h-4 w-4 mr-2" />
        Post Comment
      </Button>
    </form>
  );
};

export default CommentForm;
