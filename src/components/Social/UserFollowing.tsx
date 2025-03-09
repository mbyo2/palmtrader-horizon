
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { UserCheck, UserPlus, Users, UserX } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

interface UserProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  isFollowing?: boolean;
}

const UserFollowing = () => {
  const [following, setFollowing] = useState<UserProfile[]>([]);
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      loadFollowing();
      loadFollowers();
      loadSuggestedUsers();
    }
  }, [currentUserId]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setCurrentUserId(session.user.id);
    } else {
      setLoading(false);
    }
  };

  const loadFollowing = async () => {
    try {
      if (!currentUserId) return;
      
      const { data, error } = await supabase
        .from("user_follows")
        .select(`
          following_id,
          following:following_id(id, username, avatar_url)
        `)
        .eq("follower_id", currentUserId);
        
      if (error) throw error;
      
      const followingUsers = data.map(item => ({
        id: item.following_id,
        username: item.following?.username || "Unknown User",
        avatar_url: item.following?.avatar_url,
        isFollowing: true
      }));
      
      setFollowing(followingUsers);
    } catch (error) {
      console.error("Error loading following:", error);
      toast({
        title: "Failed to load following",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFollowers = async () => {
    try {
      if (!currentUserId) return;
      
      const { data, error } = await supabase
        .from("user_follows")
        .select(`
          follower_id,
          followers:follower_id(id, username, avatar_url)
        `)
        .eq("following_id", currentUserId);
        
      if (error) throw error;
      
      // Check which followers you are following back
      const followerIds = data.map(item => item.follower_id);
      
      const followingCheck = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", currentUserId)
        .in("following_id", followerIds);
      
      const followingSet = new Set(followingCheck.data?.map(item => item.following_id) || []);
      
      const followersList = data.map(item => ({
        id: item.follower_id,
        username: item.followers?.username || "Unknown User",
        avatar_url: item.followers?.avatar_url,
        isFollowing: followingSet.has(item.follower_id)
      }));
      
      setFollowers(followersList);
    } catch (error) {
      console.error("Error loading followers:", error);
      toast({
        title: "Failed to load followers",
        variant: "destructive"
      });
    }
  };

  const loadSuggestedUsers = async () => {
    try {
      if (!currentUserId) return;
      
      // Get a list of users you're already following
      const { data: followingData } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", currentUserId);
      
      const followingIds = new Set([
        ...(followingData?.map(item => item.following_id) || []), 
        currentUserId // Exclude yourself
      ]);
      
      // Get suggested users (users you're not following)
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (error) throw error;
      
      const suggested = data
        .filter(user => !followingIds.has(user.id))
        .map(user => ({
          ...user,
          isFollowing: false
        }));
      
      setSuggestedUsers(suggested);
    } catch (error) {
      console.error("Error loading suggested users:", error);
    }
  };

  const handleFollow = async (userId: string) => {
    try {
      if (!currentUserId) {
        toast({
          title: "Please sign in to follow users",
          variant: "destructive"
        });
        return;
      }
      
      const { error } = await supabase
        .from("user_follows")
        .insert({
          follower_id: currentUserId,
          following_id: userId
        });
      
      if (error) throw error;
      
      // Update UI state
      setFollowing(prev => [...prev, suggestedUsers.find(u => u.id === userId)!]);
      setSuggestedUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, isFollowing: true } : user
      ));
      setFollowers(prev => prev.map(user => 
        user.id === userId ? { ...user, isFollowing: true } : user
      ));
      
      toast({
        title: "Followed successfully",
      });
    } catch (error) {
      console.error("Error following user:", error);
      toast({
        title: "Failed to follow user",
        variant: "destructive"
      });
    }
  };

  const handleUnfollow = async (userId: string) => {
    try {
      if (!currentUserId) return;
      
      const { error } = await supabase
        .from("user_follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", userId);
      
      if (error) throw error;
      
      // Update UI state
      setFollowing(prev => prev.filter(user => user.id !== userId));
      setSuggestedUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, isFollowing: false } : user
      ));
      setFollowers(prev => prev.map(user => 
        user.id === userId ? { ...user, isFollowing: false } : user
      ));
      
      toast({
        title: "Unfollowed successfully",
      });
    } catch (error) {
      console.error("Error unfollowing user:", error);
      toast({
        title: "Failed to unfollow user",
        variant: "destructive"
      });
    }
  };

  if (!currentUserId) {
    return (
      <div className="p-6 text-center border border-dashed rounded-lg">
        <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">Follow Other Traders</h3>
        <p className="text-muted-foreground mb-4">Sign in to connect with other traders and see their activity</p>
        <Button>Sign In</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 border rounded-md">
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-5 w-32" />
              </div>
              <Skeleton className="h-9 w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="following">
        <TabsList className="w-full">
          <TabsTrigger value="following" className="flex-1">
            Following ({following.length})
          </TabsTrigger>
          <TabsTrigger value="followers" className="flex-1">
            Followers ({followers.length})
          </TabsTrigger>
          <TabsTrigger value="suggested" className="flex-1">
            Suggested
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="following" className="space-y-2 mt-2">
          {following.length === 0 ? (
            <div className="text-center p-6 border border-dashed rounded-md">
              <UserPlus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">You are not following anyone yet</p>
            </div>
          ) : (
            following.map(user => (
              <div key={user.id} className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-2">
                  <Avatar>
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>{user.username?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{user.username || "Unknown User"}</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleUnfollow(user.id)}
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Following
                </Button>
              </div>
            ))
          )}
        </TabsContent>
        
        <TabsContent value="followers" className="space-y-2 mt-2">
          {followers.length === 0 ? (
            <div className="text-center p-6 border border-dashed rounded-md">
              <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">You don't have any followers yet</p>
            </div>
          ) : (
            followers.map(user => (
              <div key={user.id} className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-2">
                  <Avatar>
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>{user.username?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{user.username || "Unknown User"}</span>
                </div>
                {user.isFollowing ? (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleUnfollow(user.id)}
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Following
                  </Button>
                ) : (
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => handleFollow(user.id)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Follow Back
                  </Button>
                )}
              </div>
            ))
          )}
        </TabsContent>
        
        <TabsContent value="suggested" className="space-y-2 mt-2">
          {suggestedUsers.length === 0 ? (
            <div className="text-center p-6 border border-dashed rounded-md">
              <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">No suggested users available</p>
            </div>
          ) : (
            suggestedUsers.map(user => (
              <div key={user.id} className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-2">
                  <Avatar>
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>{user.username?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{user.username || "Unknown User"}</span>
                </div>
                <Button 
                  variant={user.isFollowing ? "outline" : "default"}
                  size="sm"
                  onClick={() => user.isFollowing ? handleUnfollow(user.id) : handleFollow(user.id)}
                >
                  {user.isFollowing ? (
                    <>
                      <UserX className="h-4 w-4 mr-2" />
                      Unfollow
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Follow
                    </>
                  )}
                </Button>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserFollowing;
