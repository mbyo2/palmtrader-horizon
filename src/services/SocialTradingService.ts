
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UserFollow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface CommentLike {
  id: string;
  user_id: string;
  comment_id: string;
  created_at: string;
}

export interface SocialComment {
  id: string;
  user_id: string;
  content: string;
  symbol: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  likes_count?: number;
  user_liked?: boolean;
  user_profile?: {
    display_name: string;
    username: string;
  } | null;
}

export interface PopularStock {
  symbol: string;
  comment_count: number;
  unique_users: number;
}

export class SocialTradingService {
  // Follow/Unfollow users
  static async followUser(followingId: string): Promise<boolean> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("user_follows")
        .insert({
          follower_id: user.user.id,
          following_id: followingId
        });

      if (error) throw error;

      toast.success("User followed successfully");
      return true;
    } catch (error) {
      console.error("Error following user:", error);
      toast.error("Failed to follow user");
      return false;
    }
  }

  static async unfollowUser(followingId: string): Promise<boolean> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("user_follows")
        .delete()
        .eq("follower_id", user.user.id)
        .eq("following_id", followingId);

      if (error) throw error;

      toast.success("User unfollowed successfully");
      return true;
    } catch (error) {
      console.error("Error unfollowing user:", error);
      toast.error("Failed to unfollow user");
      return false;
    }
  }

  // Check if current user follows another user
  static async isFollowing(followingId: string): Promise<boolean> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return false;

      const { data, error } = await supabase
        .from("user_follows")
        .select("id")
        .eq("follower_id", user.user.id)
        .eq("following_id", followingId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return !!data;
    } catch (error) {
      console.error("Error checking follow status:", error);
      return false;
    }
  }

  // Get user's followers/following
  static async getUserFollowers(userId: string): Promise<UserFollow[]> {
    try {
      const { data, error } = await supabase
        .from("user_follows")
        .select("*")
        .eq("following_id", userId);

      if (error) throw error;
      return (data || []) as UserFollow[];
    } catch (error) {
      console.error("Error fetching followers:", error);
      return [];
    }
  }

  static async getUserFollowing(userId: string): Promise<UserFollow[]> {
    try {
      const { data, error } = await supabase
        .from("user_follows")
        .select("*")
        .eq("follower_id", userId);

      if (error) throw error;
      return (data || []) as UserFollow[];
    } catch (error) {
      console.error("Error fetching following:", error);
      return [];
    }
  }

  // Like/Unlike comments
  static async likeComment(commentId: string): Promise<boolean> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("comment_likes")
        .insert({
          user_id: user.user.id,
          comment_id: commentId
        });

      if (error) throw error;

      toast.success("Comment liked");
      return true;
    } catch (error) {
      console.error("Error liking comment:", error);
      toast.error("Failed to like comment");
      return false;
    }
  }

  static async unlikeComment(commentId: string): Promise<boolean> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("comment_likes")
        .delete()
        .eq("user_id", user.user.id)
        .eq("comment_id", commentId);

      if (error) throw error;

      toast.success("Comment unliked");
      return true;
    } catch (error) {
      console.error("Error unliking comment:", error);
      toast.error("Failed to unlike comment");
      return false;
    }
  }

  // Get comments with social data
  static async getCommentsWithSocialData(symbol?: string, limit: number = 50): Promise<SocialComment[]> {
    try {
      let query = supabase
        .from("comments")
        .select(`
          *,
          comment_likes(count),
          user_profiles(display_name, username)
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (symbol) {
        query = query.eq("symbol", symbol);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get current user's likes
      const { data: user } = await supabase.auth.getUser();
      let userLikes: string[] = [];

      if (user.user) {
        const { data: likes } = await supabase
          .from("comment_likes")
          .select("comment_id")
          .eq("user_id", user.user.id);

        userLikes = likes?.map(like => like.comment_id) || [];
      }

      return (data || []).map(comment => ({
        id: comment.id,
        user_id: comment.user_id,
        content: comment.content,
        symbol: comment.symbol,
        parent_id: comment.parent_id,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        likes_count: comment.comment_likes?.[0]?.count || 0,
        user_liked: userLikes.includes(comment.id),
        user_profile: comment.user_profiles?.[0] ? {
          display_name: comment.user_profiles[0].display_name || '',
          username: comment.user_profiles[0].username || ''
        } : null
      })) as SocialComment[];
    } catch (error) {
      console.error("Error fetching social comments:", error);
      return [];
    }
  }

  // Get popular stocks based on social activity
  static async getPopularStocks(): Promise<PopularStock[]> {
    try {
      const { data, error } = await supabase.rpc("get_popular_stocks");

      if (error) throw error;
      return (data || []) as PopularStock[];
    } catch (error) {
      console.error("Error fetching popular stocks:", error);
      return [];
    }
  }

  // Get social sentiment for a symbol
  static async getSocialSentiment(symbol: string): Promise<{
    totalComments: number;
    uniqueUsers: number;
    averageLikes: number;
  }> {
    try {
      const { data: comments, error } = await supabase
        .from("comments")
        .select(`
          id,
          user_id,
          comment_likes(count)
        `)
        .eq("symbol", symbol);

      if (error) throw error;

      const totalComments = comments?.length || 0;
      const uniqueUsers = new Set(comments?.map(c => c.user_id)).size;
      const totalLikes = comments?.reduce((sum, comment) => {
        return sum + (comment.comment_likes?.[0]?.count || 0);
      }, 0) || 0;
      const averageLikes = totalComments > 0 ? totalLikes / totalComments : 0;

      return {
        totalComments,
        uniqueUsers,
        averageLikes
      };
    } catch (error) {
      console.error("Error fetching social sentiment:", error);
      return { totalComments: 0, uniqueUsers: 0, averageLikes: 0 };
    }
  }
}
