import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus, User } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface UserFollowingProps {
  userId: string;
  username?: string;
}

const UserFollowing = ({ userId, username }: UserFollowingProps) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkFollowStatus();
  }, [userId]);

  const checkFollowStatus = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      const { data } = await supabase
        .from("user_follows")
        .select("*")
        .eq("follower_id", session.session.user.id)
        .eq("following_id", userId)
        .single();

      setIsFollowing(!!data);
    } catch (error) {
      console.error("Error checking follow status:", error);
    }
  };

  const handleFollow = async () => {
    try {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast({
          title: "Please sign in to follow users",
          variant: "destructive",
        });
        return;
      }

      if (isFollowing) {
        await supabase
          .from("user_follows")
          .delete()
          .eq("follower_id", session.session.user.id)
          .eq("following_id", userId);
        toast({
          title: `Unfollowed ${username || "user"}`,
        });
      } else {
        await supabase.from("user_follows").insert({
          follower_id: session.session.user.id,
          following_id: userId,
        });
        toast({
          title: `Following ${username || "user"}`,
        });
      }

      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error("Error following/unfollowing:", error);
      toast({
        title: "Error updating follow status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleFollow}
      disabled={loading}
    >
      {isFollowing ? (
        <>
          <UserMinus className="h-4 w-4 mr-2" />
          Unfollow
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4 mr-2" />
          Follow
        </>
      )}
    </Button>
  );
};

export default UserFollowing;