
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, UserPlus, Users, RefreshCcw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

const UserFollowing = () => {
  const [following, setFollowing] = useState<UserProfile[]>([]);
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [suggested, setSuggested] = useState<UserProfile[]>([]);
  const [loadingFollowing, setLoadingFollowing] = useState(true);
  const [loadingFollowers, setLoadingFollowers] = useState(true);
  const [loadingSuggested, setLoadingSuggested] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      setCurrentUserId(session.user.id);
      loadFollowing(session.user.id);
      loadFollowers(session.user.id);
      loadSuggestedUsers(session.user.id);
    }
  };

  const loadFollowing = async (userId: string) => {
    try {
      setLoadingFollowing(true);
      // First get the user IDs that the current user is following
      const { data: followingData, error: followingError } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", userId);

      if (followingError) throw followingError;
      
      if (!followingData || followingData.length === 0) {
        setFollowing([]);
        return;
      }
      
      // Then get the profile data for those users
      const followingIds = followingData.map(item => item.following_id);
      
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", followingIds);
      
      if (profilesError) throw profilesError;
      
      setFollowing(profilesData || []);
    } catch (error) {
      console.error("Error loading following:", error);
      toast.error("Failed to load users you follow");
    } finally {
      setLoadingFollowing(false);
    }
  };

  const loadFollowers = async (userId: string) => {
    try {
      setLoadingFollowers(true);
      // First get the user IDs of users following the current user
      const { data: followerData, error: followerError } = await supabase
        .from("user_follows")
        .select("follower_id")
        .eq("following_id", userId);

      if (followerError) throw followerError;
      
      if (!followerData || followerData.length === 0) {
        setFollowers([]);
        return;
      }
      
      // Then get the profile data for those users
      const followerIds = followerData.map(item => item.follower_id);
      
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", followerIds);
      
      if (profilesError) throw profilesError;
      
      setFollowers(profilesData || []);
    } catch (error) {
      console.error("Error loading followers:", error);
      toast.error("Failed to load your followers");
    } finally {
      setLoadingFollowers(false);
    }
  };

  const loadSuggestedUsers = async (userId: string) => {
    try {
      setLoadingSuggested(true);
      // Get following IDs to exclude from suggestions
      const { data: followingData } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", userId);
      
      const followingIds = followingData ? followingData.map(f => f.following_id) : [];
      followingIds.push(userId); // Also exclude current user
      
      // Get some random profiles that the user is not following
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .not("id", "in", `(${followingIds.join(",")})`)
        .limit(5);
      
      if (error) throw error;
      
      setSuggested(data || []);
    } catch (error) {
      console.error("Error loading suggested users:", error);
      // No need to show error toast for suggestions
    } finally {
      setLoadingSuggested(false);
    }
  };

  const handleFollow = async (userId: string) => {
    if (!currentUserId) {
      toast.error("Please sign in to follow users");
      return;
    }

    try {
      const { error } = await supabase
        .from("user_follows")
        .insert({
          follower_id: currentUserId,
          following_id: userId
        });
      
      if (error) throw error;
      
      toast.success("User followed successfully");
      // Reload data
      loadFollowing(currentUserId);
      loadSuggestedUsers(currentUserId);
    } catch (error) {
      console.error("Error following user:", error);
      toast.error("Failed to follow user");
    }
  };

  const handleUnfollow = async (userId: string) => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from("user_follows")
        .delete()
        .match({
          follower_id: currentUserId,
          following_id: userId
        });
      
      if (error) throw error;
      
      toast.success("User unfollowed");
      // Update the following list
      setFollowing(following.filter(user => user.id !== userId));
      // Reload suggested users
      loadSuggestedUsers(currentUserId);
    } catch (error) {
      console.error("Error unfollowing user:", error);
      toast.error("Failed to unfollow user");
    }
  };

  const renderUserList = (users: UserProfile[], loading: boolean, showFollowButton = false, showUnfollowButton = false) => {
    if (loading) {
      return Array(3).fill(0).map((_, index) => (
        <div key={index} className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div>
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
      ));
    }

    if (users.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-2 opacity-20" />
          <p>No users found</p>
        </div>
      );
    }

    return users.map(user => (
      <div key={user.id} className="flex items-center justify-between p-3 border-b last:border-b-0">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{user.username || "Anonymous"}</p>
          </div>
        </div>
        {showFollowButton && (
          <Button size="sm" onClick={() => handleFollow(user.id)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Follow
          </Button>
        )}
        {showUnfollowButton && (
          <Button variant="outline" size="sm" onClick={() => handleUnfollow(user.id)}>
            Unfollow
          </Button>
        )}
      </div>
    ));
  };

  return (
    <Card className="p-4">
      <Tabs defaultValue="following">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="following">Following</TabsTrigger>
          <TabsTrigger value="followers">Followers</TabsTrigger>
          <TabsTrigger value="suggested">Suggested</TabsTrigger>
        </TabsList>
        
        <TabsContent value="following">
          <div className="rounded-md border max-h-96 overflow-y-auto">
            {renderUserList(following, loadingFollowing, false, true)}
          </div>
        </TabsContent>
        
        <TabsContent value="followers">
          <div className="rounded-md border max-h-96 overflow-y-auto">
            {renderUserList(followers, loadingFollowers)}
          </div>
        </TabsContent>
        
        <TabsContent value="suggested">
          <div className="flex justify-end mb-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => currentUserId && loadSuggestedUsers(currentUserId)}
              disabled={loadingSuggested}
            >
              <RefreshCcw className={`h-3 w-3 mr-2 ${loadingSuggested ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          <div className="rounded-md border max-h-96 overflow-y-auto">
            {renderUserList(suggested, loadingSuggested, true)}
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default UserFollowing;
