/** Shapes returned by the profile_cards() and discover() database functions. */

export type ReasonCode =
  | "same_intention"
  | "same_pace"
  | "spoons_fit"
  | "both_cuddly"
  | "same_love_language"
  | "shared_interests";

export type Reason = { code: ReasonCode; value?: string; count?: number };

export type DistanceBucket = "under_5" | "5_10" | "10_25" | "25_50" | "50_plus";

export type CardPhoto = {
  id: string;
  path: string;
  width: number | null;
  height: number | null;
  url?: string | null;
};

export type ProfileCard = {
  id: string;
  display_name: string | null;
  age: number | null;
  gender: string | null;
  pronouns: string | null;
  city: string | null;
  intention: string | null;
  bio: string | null;
  job_title: string | null;
  education: string | null;
  distance: DistanceBucket | null;
  /** Added on the server in the viewer's unit (km / miles). */
  distance_label?: string | null;
  /** Exact time is stripped on the server; only this coarse label reaches the browser. */
  last_active_at: string | null;
  last_active_label?: string | null;
  affection: {
    cuddle_style: string | null;
    pace: string | null;
    touch_comfort: number | null;
    public_affection: number | null;
    love_languages: string[];
  } | null;
  lifestyle: Record<string, string | null> | null;
  interests: string[];
  prompts: { question: string; answer: string }[];
  photos: CardPhoto[];
  compatibility: {
    score: number;
    reasons: Reason[];
    parts: Record<string, number>;
  } | null;
  match_id: string | null;
  /** Photo-verified by our team (added on the server). */
  verified?: boolean;
};

export type SwipeAction = "like" | "super" | "pass";

export type SwipeResult =
  | { ok: true; matched: boolean; matchId: string | null }
  | { ok: false; code: string; message: string };

export type DiscoverFilters = {
  intentions?: string[];
  interest_ids?: string[];
  cuddle_styles?: string[];
  paces?: string[];
  recently_active_days?: number;
};
