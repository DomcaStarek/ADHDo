export interface ADHDPreferences {
  cleaning_style: string;
  tags: string[];
  preferred_duration: number;
}

export interface User {
  id: string;
  email: string;
  display_name: string;
  bio?: string | null;
  avatar_url?: string | null;
  adhd_preferences: ADHDPreferences;
  is_active: boolean;
  is_verified: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserPublicProfile {
  id: string;
  display_name: string;
  bio?: string | null;
  avatar_url?: string | null;
  adhd_preferences: ADHDPreferences;
}

export interface CleaningTask {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  photo_url: string;
  estimated_duration_minutes: number;
  status: 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface FeedItem {
  task_id: string;
  title: string;
  description?: string | null;
  photo_url: string;
  estimated_duration_minutes: number;
  created_at: string;
  user: UserPublicProfile;
}

export interface MatchData {
  match_id: string;
  matched_with: UserPublicProfile;
  their_task?: CleaningTask | null;
  matched_at: string;
}

export interface SwipeResponse {
  is_match: boolean;
  match_data?: MatchData | null;
}

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface MatchSummary {
  match_id: string;
  matched_user: UserPublicProfile;
  matched_user_task?: CleaningTask | null;
  my_task?: CleaningTask | null;
  last_message?: Message | null;
  unread_count: number;
  is_active: boolean;
  created_at: string;
}

export interface MatchDetail {
  id: string;
  is_active: boolean;
  matched_at: string;
  other_user: UserPublicProfile;
  other_user_task?: CleaningTask | null;
  my_task?: CleaningTask | null;
}
