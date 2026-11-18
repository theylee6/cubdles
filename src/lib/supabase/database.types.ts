// Generated from the Supabase project schema. Regenerate after every migration:
//   supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      affection_profiles: {
        Row: {
          cuddle_style: Database["public"]["Enums"]["cuddle_style"] | null
          love_languages: string[]
          pace: Database["public"]["Enums"]["affection_pace"] | null
          profile_id: string
          public_affection: number | null
          touch_comfort: number | null
          updated_at: string
        }
        Insert: {
          cuddle_style?: Database["public"]["Enums"]["cuddle_style"] | null
          love_languages?: string[]
          pace?: Database["public"]["Enums"]["affection_pace"] | null
          profile_id: string
          public_affection?: number | null
          touch_comfort?: number | null
          updated_at?: string
        }
        Update: {
          cuddle_style?: Database["public"]["Enums"]["cuddle_style"] | null
          love_languages?: string[]
          pace?: Database["public"]["Enums"]["affection_pace"] | null
          profile_id?: string
          public_affection?: number | null
          touch_comfort?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affection_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      age_gate_blocks: {
        Row: { created_at: string; email_hash: string }
        Insert: { created_at?: string; email_hash: string }
        Update: { created_at?: string; email_hash?: string }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          id: number
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: never
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: never
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      blocks: {
        Row: { blocked_id: string; blocker_id: string; created_at: string }
        Insert: { blocked_id: string; blocker_id: string; created_at?: string }
        Update: { blocked_id?: string; blocker_id?: string; created_at?: string }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string
          topic: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string
          topic: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
          topic?: string
          user_id?: string | null
        }
        Relationships: []
      }
      entitlements: {
        Row: { feature_key: string; limit_value: number | null; period: string | null; plan_id: string }
        Insert: { feature_key: string; limit_value?: number | null; period?: string | null; plan_id: string }
        Update: { feature_key?: string; limit_value?: number | null; period?: string | null; plan_id?: string }
        Relationships: [
          {
            foreignKeyName: "entitlements_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      interests: {
        Row: { active: boolean; category: string; id: number; label: string; slug: string }
        Insert: { active?: boolean; category: string; id?: never; label: string; slug: string }
        Update: { active?: boolean; category?: string; id?: never; label?: string; slug?: string }
        Relationships: []
      }
      lifestyle: {
        Row: {
          diet: string | null
          drinking: string | null
          exercise: string | null
          kids: string | null
          pets: string | null
          profile_id: string
          religion: string | null
          smoking: string | null
          updated_at: string
        }
        Insert: {
          diet?: string | null
          drinking?: string | null
          exercise?: string | null
          kids?: string | null
          pets?: string | null
          profile_id: string
          religion?: string | null
          smoking?: string | null
          updated_at?: string
        }
        Update: {
          diet?: string | null
          drinking?: string | null
          exercise?: string | null
          kids?: string | null
          pets?: string | null
          profile_id?: string
          religion?: string | null
          smoking?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lifestyle_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          blurhash: string | null
          created_at: string
          height: number | null
          id: string
          moderation_note: string | null
          moderation_status: Database["public"]["Enums"]["moderation_status"]
          position: number
          profile_id: string
          storage_path: string
          width: number | null
        }
        Insert: {
          blurhash?: string | null
          created_at?: string
          height?: number | null
          id?: string
          moderation_note?: string | null
          moderation_status?: Database["public"]["Enums"]["moderation_status"]
          position: number
          profile_id: string
          storage_path: string
          width?: number | null
        }
        Update: {
          blurhash?: string | null
          created_at?: string
          height?: number | null
          id?: string
          moderation_note?: string | null
          moderation_status?: Database["public"]["Enums"]["moderation_status"]
          position?: number
          profile_id?: string
          storage_path?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_prices: {
        Row: {
          active: boolean
          amount_minor: number
          created_at: string
          currency: string
          id: string
          period_months: number
          plan_id: string
          provider: string | null
          provider_plan_id: string | null
        }
        Insert: {
          active?: boolean
          amount_minor: number
          created_at?: string
          currency: string
          id?: string
          period_months: number
          plan_id: string
          provider?: string | null
          provider_plan_id?: string | null
        }
        Update: {
          active?: boolean
          amount_minor?: number
          created_at?: string
          currency?: string
          id?: string
          period_months?: number
          plan_id?: string
          provider?: string | null
          provider_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_prices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string | null
          id: string
          is_free: boolean
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_free?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_free?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      preferences: {
        Row: {
          age_max: number
          age_min: number
          dealbreakers: Json
          intentions: Database["public"]["Enums"]["relationship_intention"][]
          max_distance_km: number
          profile_id: string
          show_genders: string[]
          updated_at: string
          weights: Json
        }
        Insert: {
          age_max?: number
          age_min?: number
          dealbreakers?: Json
          intentions?: Database["public"]["Enums"]["relationship_intention"][]
          max_distance_km?: number
          profile_id: string
          show_genders?: string[]
          updated_at?: string
          weights?: Json
        }
        Update: {
          age_max?: number
          age_min?: number
          dealbreakers?: Json
          intentions?: Database["public"]["Enums"]["relationship_intention"][]
          max_distance_km?: number
          profile_id?: string
          show_genders?: string[]
          updated_at?: string
          weights?: Json
        }
        Relationships: [
          {
            foreignKeyName: "preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      privacy_settings: {
        Row: {
          hide_age: boolean
          hide_distance: boolean
          profile_id: string
          send_read_receipts: boolean
          show_last_active: boolean
          show_online_status: boolean
          updated_at: string
        }
        Insert: {
          hide_age?: boolean
          hide_distance?: boolean
          profile_id: string
          send_read_receipts?: boolean
          show_last_active?: boolean
          show_online_status?: boolean
          updated_at?: string
        }
        Update: {
          hide_age?: boolean
          hide_distance?: boolean
          profile_id?: string
          send_read_receipts?: boolean
          show_last_active?: boolean
          show_online_status?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "privacy_settings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_interests: {
        Row: { interest_id: number; profile_id: string }
        Insert: { interest_id: number; profile_id: string }
        Update: { interest_id?: number; profile_id?: string }
        Relationships: [
          {
            foreignKeyName: "profile_interests_interest_id_fkey"
            columns: ["interest_id"]
            isOneToOne: false
            referencedRelation: "interests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_interests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_private: {
        Row: {
          birth_date: string | null
          created_at: string
          location: unknown
          marketing_consent: boolean
          phone_e164: string | null
          phone_verified_at: string | null
          privacy_accepted_at: string | null
          profile_id: string
          terms_accepted_at: string | null
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          location?: unknown
          marketing_consent?: boolean
          phone_e164?: string | null
          phone_verified_at?: string | null
          privacy_accepted_at?: string | null
          profile_id: string
          terms_accepted_at?: string | null
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          location?: unknown
          marketing_consent?: boolean
          phone_e164?: string | null
          phone_verified_at?: string | null
          privacy_accepted_at?: string | null
          profile_id?: string
          terms_accepted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_private_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_prompts: {
        Row: { answer: string; position: number; profile_id: string; prompt_id: number }
        Insert: { answer: string; position: number; profile_id: string; prompt_id: number }
        Update: { answer?: string; position?: number; profile_id?: string; prompt_id?: number }
        Relationships: [
          {
            foreignKeyName: "profile_prompts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_prompts_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string | null
          city: string | null
          created_at: string
          display_name: string | null
          education: string | null
          gender_group: string | null
          gender_identity: string | null
          id: string
          intention: Database["public"]["Enums"]["relationship_intention"] | null
          is_incognito: boolean
          job_title: string | null
          last_active_at: string
          onboarding_step: number
          pronouns: string | null
          status: Database["public"]["Enums"]["profile_status"]
          status_reason: string | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          education?: string | null
          gender_group?: string | null
          gender_identity?: string | null
          id: string
          intention?: Database["public"]["Enums"]["relationship_intention"] | null
          is_incognito?: boolean
          job_title?: string | null
          last_active_at?: string
          onboarding_step?: number
          pronouns?: string | null
          status?: Database["public"]["Enums"]["profile_status"]
          status_reason?: string | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          education?: string | null
          gender_group?: string | null
          gender_identity?: string | null
          id?: string
          intention?: Database["public"]["Enums"]["relationship_intention"] | null
          is_incognito?: boolean
          job_title?: string | null
          last_active_at?: string
          onboarding_step?: number
          pronouns?: string | null
          status?: Database["public"]["Enums"]["profile_status"]
          status_reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      prompts: {
        Row: { active: boolean; id: number; text: string }
        Insert: { active?: boolean; id?: never; text: string }
        Update: { active?: boolean; id?: never; text?: string }
        Relationships: []
      }
      staff_roles: {
        Row: {
          created_at: string
          granted_by: string | null
          role: Database["public"]["Enums"]["staff_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          role: Database["public"]["Enums"]["staff_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          role?: Database["public"]["Enums"]["staff_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_terms: { Args: { p_marketing?: boolean }; Returns: undefined }
      age_in_years: { Args: { birth: string }; Returns: number }
      compact_photo_positions: { Args: never; Returns: undefined }
      complete_onboarding: { Args: never; Returns: undefined }
      next_photo_position: { Args: never; Returns: number }
      profile_age: { Args: { target: string }; Returns: number }
      reorder_photos: { Args: { p_ids: string[] }; Returns: undefined }
      set_location: {
        Args: { p_city: string; p_lat: number; p_lng: number }
        Returns: undefined
      }
      set_profile_interests: { Args: { p_ids: number[] }; Returns: undefined }
      set_profile_prompts: { Args: { p_answers: Json }; Returns: undefined }
      staff_set_profile_status: {
        Args: {
          new_status: Database["public"]["Enums"]["profile_status"]
          reason: string
          target: string
        }
        Returns: undefined
      }
      submit_birth_date: { Args: { p_birth_date: string }; Returns: boolean }
      write_audit_log: {
        Args: {
          p_action: string
          p_after?: Json
          p_before?: Json
          p_target_id: string
          p_target_type: string
        }
        Returns: undefined
      }
    }
    Enums: {
      affection_pace: "slow" | "steady" | "quick"
      cuddle_style: "big_spoon" | "little_spoon" | "either" | "not_sure"
      moderation_status: "pending" | "approved" | "rejected"
      profile_status: "onboarding" | "active" | "paused" | "suspended" | "banned" | "deleted"
      relationship_intention: "life_partner" | "long_term" | "long_term_open" | "short_term_open" | "figuring_out"
      staff_role: "admin" | "moderator" | "support"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Update"]
export type Enums<T extends keyof DefaultSchema["Enums"]> = DefaultSchema["Enums"][T]
