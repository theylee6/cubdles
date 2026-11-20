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
      likes: {
        Row: { created_at: string; from_id: string; kind: Database["public"]["Enums"]["like_kind"]; note: string | null; to_id: string }
        Insert: { created_at?: string; from_id: string; kind?: Database["public"]["Enums"]["like_kind"]; note?: string | null; to_id: string }
        Update: { created_at?: string; from_id?: string; kind?: Database["public"]["Enums"]["like_kind"]; note?: string | null; to_id?: string }
        Relationships: []
      }
      passes: {
        Row: { created_at: string; from_id: string; to_id: string }
        Insert: { created_at?: string; from_id: string; to_id: string }
        Update: { created_at?: string; from_id?: string; to_id?: string }
        Relationships: []
      }
      reports: {
        Row: {
          id: string
          reporter_id: string | null
          reported_id: string | null
          match_id: string | null
          message_id: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          details: string | null
          priority: Database["public"]["Enums"]["report_priority"]
          status: Database["public"]["Enums"]["report_status"]
          action: string | null
          resolution: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: never
        Update: never
        Relationships: []
      }
      safety_notices: {
        Row: {
          id: string
          profile_id: string
          kind: Database["public"]["Enums"]["safety_notice_kind"]
          subject_id: string | null
          subject_name: string | null
          last_contact_at: string | null
          reason: Database["public"]["Enums"]["report_reason"] | null
          created_at: string
          dismissed_at: string | null
        }
        Insert: never
        Update: never
        Relationships: []
      }
      messages: {
        Row: { id: string; match_id: string; sender_id: string; body: string; client_id: string; created_at: string }
        Insert: never
        Update: never
        Relationships: []
      }
      match_reads: {
        Row: { match_id: string; profile_id: string; last_read_at: string }
        Insert: never
        Update: never
        Relationships: []
      }
      matches: {
        Row: {
          created_at: string
          ended_at: string | null
          ended_by: string | null
          ended_reason: Database["public"]["Enums"]["match_end_reason"] | null
          id: string
          last_message_at: string | null
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          ended_by?: string | null
          ended_reason?: Database["public"]["Enums"]["match_end_reason"] | null
          id?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          ended_by?: string | null
          ended_reason?: Database["public"]["Enums"]["match_end_reason"] | null
          id?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      daily_picks: {
        Row: { pick_date: string; pick_id: string; rank: number; reasons: Json; score: number; user_id: string }
        Insert: { pick_date: string; pick_id: string; rank: number; reasons?: Json; score: number; user_id: string }
        Update: { pick_date?: string; pick_id?: string; rank?: number; reasons?: Json; score?: number; user_id?: string }
        Relationships: []
      }
      compatibility_config: {
        Row: { active: boolean; created_at: string; created_by: string | null; version: number; weights: Json }
        Insert: { active?: boolean; created_at?: string; created_by?: string | null; version?: never; weights: Json }
        Update: { active?: boolean; created_at?: string; created_by?: string | null; version?: never; weights?: Json }
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
          distance_unit: string
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
          deletion_requested_at: string | null
          status_before_deletion: Database["public"]["Enums"]["profile_status"] | null
          timezone: string | null
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
          country_code: string | null
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
      create_report: {
        Args: {
          p_reported: string
          p_reason: Database["public"]["Enums"]["report_reason"]
          p_details?: string | null
          p_match_id?: string | null
          p_message_id?: string | null
          p_block?: boolean
        }
        Returns: string
      }
      dismiss_safety_notice: { Args: { p_id: string }; Returns: undefined }
      my_staff_roles: { Args: never; Returns: string[] }
      staff_queue_counts: { Args: never; Returns: Json }
      staff_pending_photos: {
        Args: { p_limit?: number }
        Returns: {
          photo_id: string
          profile_id: string
          storage_path: string
          display_name: string | null
          profile_status: Database["public"]["Enums"]["profile_status"]
          uploaded_at: string
        }[]
      }
      staff_moderate_photo: { Args: { p_photo: string; p_approve: boolean; p_note?: string | null }; Returns: undefined }
      staff_list_reports: {
        Args: { p_status?: Database["public"]["Enums"]["report_status"]; p_limit?: number }
        Returns: {
          report_id: string
          reason: Database["public"]["Enums"]["report_reason"]
          priority: Database["public"]["Enums"]["report_priority"]
          status: Database["public"]["Enums"]["report_status"]
          details: string | null
          created_at: string
          reported_id: string | null
          reported_name: string | null
          reported_status: Database["public"]["Enums"]["profile_status"] | null
          reporter_id: string | null
          reporter_name: string | null
          reports_against: number
        }[]
      }
      staff_report_detail: { Args: { p_report: string }; Returns: Json }
      staff_resolve_report: { Args: { p_report: string; p_action: string; p_note: string; p_fraud?: boolean }; Returns: Json }
      send_message: {
        Args: { p_match_id: string; p_body: string; p_client_id: string }
        Returns: { id: string; match_id: string; sender_id: string; body: string; client_id: string; created_at: string }
      }
      mark_conversation_read: { Args: { p_match_id: string }; Returns: undefined }
      my_conversations: {
        Args: never
        Returns: {
          match_id: string
          other_id: string
          matched_at: string
          last_message_at: string | null
          last_message_preview: string | null
          last_message_mine: boolean | null
          unread_count: number
        }[]
      }
      unread_conversations_count: { Args: never; Returns: number }
      conversation_seen_at: { Args: { p_match_id: string }; Returns: string | null }
      accept_terms: { Args: { p_marketing?: boolean }; Returns: undefined }
      age_in_years: { Args: { birth: string }; Returns: number }
      compact_photo_positions: { Args: never; Returns: undefined }
      complete_onboarding: { Args: never; Returns: undefined }
      discover: {
        Args: { p_filters?: Json; p_limit?: number; p_offset?: number }
        Returns: { profile_id: string; reasons: Json; score: number }[]
      }
      get_daily_picks: { Args: never; Returns: { profile_id: string; reasons: Json; score: number }[] }
      likes_received_summary: { Args: never; Returns: Json }
      my_features: { Args: never; Returns: Json }
      my_safety_advisory: { Args: never; Returns: Json }
      set_incognito: { Args: { p_on: boolean }; Returns: undefined }
      profile_cards: { Args: { p_ids: string[] }; Returns: Json }
      request_account_deletion: { Args: never; Returns: undefined }
      restore_account: { Args: never; Returns: undefined }
      set_paused: { Args: { p_paused: boolean }; Returns: undefined }
      swipe: { Args: { p_action: string; p_note?: string; p_target: string }; Returns: Json }
      touch_last_active: { Args: never; Returns: undefined }
      undo_last_pass: { Args: never; Returns: string }
      unmatch: { Args: { p_match_id: string }; Returns: undefined }
      next_photo_position: { Args: never; Returns: number }
      profile_age: { Args: { target: string }; Returns: number }
      reorder_photos: { Args: { p_ids: string[] }; Returns: undefined }
      set_location: {
        Args: { p_city_id?: number; p_lat?: number; p_lng?: number; p_timezone?: string }
        Returns: Json
      }
      search_cities: {
        Args: { p_limit?: number; p_query: string }
        Returns: { admin_code: string | null; country_code: string; id: number; name: string; population: number }[]
      }
      set_timezone: { Args: { p_timezone: string }; Returns: undefined }
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
      report_reason: "fake_profile" | "scam" | "harassment" | "inappropriate_content" | "hate" | "underage" | "offline_safety" | "spam" | "other"
      report_status: "open" | "actioned" | "dismissed"
      report_priority: "normal" | "urgent"
      safety_notice_kind: "warning" | "fraud_ban"
      affection_pace: "slow" | "steady" | "quick"
      cuddle_style: "big_spoon" | "little_spoon" | "either" | "not_sure"
      like_kind: "like" | "super"
      match_end_reason: "unmatch" | "block" | "moderation" | "account_deleted"
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
