
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, UserPlus, UserMinus, TrendingUp, MessageCircle, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface User {
  id: string;
  username: string;
  avatar_url?: string;
  follower_count: number;
  following_count: number;
  post_count: number;
  isFollowing: boolean;
  bio?: string;
  investmentExperience?: string;
  topStocks?: string[];
}

interface FollowActivity {
  id: string;
  user: User;
  action: 'followed' | 'posted' | 'commented';
  target?: string;
  timestamp: Date;
}

const UserFollowSystem = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [followers, setFollowers] = useState<User[]>([]);
  const [recentActivity, setRecentActivity] = useState<FollowActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadSuggestedUsers(),
        loadFollowing(),
        loadFollowers(),
        loadRecentActivity()
      ]);
    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Failed to load user data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSuggestedUsers = async () => {
    // Mock data for suggested users - in production, this would use ML algorithms
    const mockUsers: User[] = [
      {
        id: '1',
        username: 'stockwizard',
        follower_count: 1250,
        following_count: 180,
        post_count: 89,
        isFollowing: false,
        bio: 'Tech stock enthusiast with 10+ years experience',
        investmentExperience: 'expert',
        topStocks: ['AAPL', 'MSFT', 'GOOGL']
      },
      {
        id: '2', 
        username: 'dividendking',
        follower_count: 890,
        following_count: 120,
        post_count: 156,
        isFollowing: false,
        bio: 'Dividend growth investor. Building wealth slowly.',
        investmentExperience: 'intermediate',
        topStocks: ['JNJ', 'PG', 'KO']
      },
      {
        id: '3',
        username: 'cryptoqueen',
        follower_count: 2100,
        following_count: 300,
        post_count: 234,
        isFollowing: true,
        bio: 'Blockchain technology & crypto enthusiast',
        investmentExperience: 'expert',
        topStocks: ['BTC', 'ETH', 'COIN']
      }
    ];
    setSuggestedUsers(mockUsers);
  };

  const loadFollowing = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('user_follows')
      .select(`
        following_id,
        profiles!user_follows_following_id_fkey (
          id,
          username,
          avatar_url
        )
      `)
      .eq('follower_id', user.id);

    if (error) {
      console.error('Error loading following:', error);
      return;
    }

    // Transform data and add mock stats
    const followingUsers = data?.map(follow => ({
      id: follow.following_id,
      username: follow.profiles?.username || 'Unknown User',
      avatar_url: follow.profiles?.avatar_url,
      follower_count: Math.floor(Math.random() * 1000),
      following_count: Math.floor(Math.random() * 500),
      post_count: Math.floor(Math.random() * 200),
      isFollowing: true
    })) || [];

    setFollowing(followingUsers);
  };

  const loadFollowers = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_follows')
      .select(`
        follower_id,
        profiles!user_follows_follower_id_fkey (
          id,
          username,
          avatar_url
        )
      `)
      .eq('following_id', user.id);

    if (error) {
      console.error('Error loading followers:', error);
      return;
    }

    // Transform data and add mock stats
    const followerUsers = data?.map(follow => ({
      id: follow.follower_id,
      username: follow.profiles?.username || 'Unknown User',
      avatar_url: follow.profiles?.avatar_url,
      follower_count: Math.floor(Math.random() * 1000),
      following_count: Math.floor(Math.random() * 500),
      post_count: Math.floor(Math.random() * 200),
      isFollowing: Math.random() > 0.5 // Random for demo
    })) || [];

    setFollowers(followerUsers);
  };

  const loadRecentActivity = async () => {
    // Mock activity data
    const mockActivity: FollowActivity[] = [
      {
        id: '1',
        user: suggestedUsers[0] || {} as User,
        action: 'posted',
        target: 'AAPL analysis',
        timestamp: new Date(Date.now() - 1000 * 60 * 30)
      },
      {
        id: '2',
        user: suggestedUsers[1] || {} as User,
        action: 'commented',
        target: 'MSFT earnings thread',
        timestamp: new Date(Date.now() - 1000 * 60 * 60)
      }
    ];
    setRecentActivity(mockActivity);
  };

  const handleFollow = async (userId: string) => {
    if (!user) {
      toast.error('Please log in to follow users');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_follows')
        .insert({
          follower_id: user.id,
          following_id: userId
        });

      if (error) throw error;

      // Update local state
      setSuggestedUsers(prev => 
        prev.map(u => u.id === userId ? { ...u, isFollowing: true, follower_count: u.follower_count + 1 } : u)
      );

      toast.success('User followed successfully');
    } catch (error) {
      console.error('Error following user:', error);
      toast.error('Failed to follow user');
    }
  };

  const handleUnfollow = async (userId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userId);

      if (error) throw error;

      // Update local state
      setSuggestedUsers(prev => 
        prev.map(u => u.id === userId ? { ...u, isFollowing: false, follower_count: Math.max(0, u.follower_count - 1) } : u)
      );
      setFollowing(prev => prev.filter(u => u.id !== userId));

      toast.success('User unfollowed');
    } catch (error) {
      console.error('Error unfollowing user:', error);
      toast.error('Failed to unfollow user');
    }
  };

  const UserCard = ({ user: targetUser, showFollowButton = true }: { user: User; showFollowButton?: boolean }) => (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Avatar>
          <AvatarImage src={targetUser.avatar_url} />
          <AvatarFallback>{targetUser.username.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{targetUser.username}</h3>
            {showFollowButton && (
              <Button
                size="sm"
                variant={targetUser.isFollowing ? "outline" : "default"}
                onClick={() => targetUser.isFollowing ? handleUnfollow(targetUser.id) : handleFollow(targetUser.id)}
              >
                {targetUser.isFollowing ? (
                  <>
                    <UserMinus className="h-4 w-4 mr-1" />
                    Unfollow
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-1" />
                    Follow
                  </>
                )}
              </Button>
            )}
          </div>
          
          {targetUser.bio && (
            <p className="text-sm text-muted-foreground mt-1">{targetUser.bio}</p>
          )}
          
          <div className="flex items-center gap-4 mt-2 text-sm">
            <span>{targetUser.follower_count} followers</span>
            <span>{targetUser.following_count} following</span>
            <span>{targetUser.post_count} posts</span>
          </div>
          
          {targetUser.investmentExperience && (
            <Badge variant="outline" className="mt-2">
              {targetUser.investmentExperience}
            </Badge>
          )}
          
          {targetUser.topStocks && (
            <div className="flex gap-1 mt-2">
              {targetUser.topStocks.map(stock => (
                <Badge key={stock} variant="secondary" className="text-xs">
                  {stock}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Social Network
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Tabs defaultValue="suggested" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="suggested">Suggested</TabsTrigger>
              <TabsTrigger value="following">Following ({following.length})</TabsTrigger>
              <TabsTrigger value="followers">Followers ({followers.length})</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="suggested" className="space-y-4">
              <h3 className="text-lg font-semibold">Suggested Users</h3>
              {suggestedUsers.map(suggestedUser => (
                <UserCard key={suggestedUser.id} user={suggestedUser} />
              ))}
            </TabsContent>

            <TabsContent value="following" className="space-y-4">
              <h3 className="text-lg font-semibold">Following</h3>
              {following.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  You're not following anyone yet. Discover users in the Suggested tab!
                </p>
              ) : (
                following.map(followedUser => (
                  <UserCard key={followedUser.id} user={followedUser} />
                ))
              )}
            </TabsContent>

            <TabsContent value="followers" className="space-y-4">
              <h3 className="text-lg font-semibold">Followers</h3>
              {followers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No followers yet. Start sharing insights to attract followers!
                </p>
              ) : (
                followers.map(follower => (
                  <UserCard key={follower.id} user={follower} showFollowButton={false} />
                ))
              )}
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <h3 className="text-lg font-semibold">Recent Activity</h3>
              {recentActivity.map(activity => (
                <Card key={activity.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={activity.user.avatar_url} />
                      <AvatarFallback>{activity.user.username?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-semibold">{activity.user.username}</span>
                        {activity.action === 'posted' && ' posted '}
                        {activity.action === 'commented' && ' commented on '}
                        {activity.action === 'followed' && ' followed you'}
                        {activity.target && <span className="text-muted-foreground">{activity.target}</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {activity.action === 'posted' && <MessageCircle className="h-4 w-4 text-muted-foreground" />}
                      {activity.action === 'commented' && <MessageCircle className="h-4 w-4 text-muted-foreground" />}
                      {activity.action === 'followed' && <TrendingUp className="h-4 w-4 text-green-500" />}
                    </div>
                  </div>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserFollowSystem;
