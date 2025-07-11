
export interface Comment {
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
