// Generated from the Supabase project with `supabase gen types typescript` (via the Supabase MCP).
// Do not edit by hand: regenerate after every migration.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      affection_profiles: {
        Row: {
          cuddle_style: Database["public"]["Enums"]["cuddle_style"] | null;
          love_languages: string[];
          pace: Database["public"]["Enums"]["affection_pace"] | null;
          profile_id: string;
          public_affection: number | null;
          touch_comfort: number | null;
          updated_at: string;
        };
        Insert: {
          cuddle_style?: Database["public"]["Enums"]["cuddle_style"] | null;
          love_languages?: string[];
          pace?: Database["public"]["Enums"]["affection_pace"] | null;
          profile_id: string;
          public_affection?: number | null;
          touch_comfort?: number | null;
          updated_at?: string;
        };
        Update: {
          cuddle_style?: Database["public"]["Enums"]["cuddle_style"] | null;
          love_languages?: string[];
          pace?: Database["public"]["Enums"]["affection_pace"] | null;
          profile_id?: string;
          public_affection?: number | null;
          touch_comfort?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "affection_profiles_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      age_gate_blocks: {
        Row: {
          created_at: string;
          email_hash: string;
        };
        Insert: {
          created_at?: string;
          email_hash: string;
        };
        Update: {
          created_at?: string;
          email_hash?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          after: Json | null;
          before: Json | null;
          created_at: string;
          id: number;
          target_id: string | null;
          target_type: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          after?: Json | null;
          before?: Json | null;
          created_at?: string;
          id?: never;
          target_id?: string | null;
          target_type: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          after?: Json | null;
          before?: Json | null;
          created_at?: string;
          id?: never;
          target_id?: string | null;
          target_type?: string;
        };
        Relationships: [];
      };
      blocks: {
        Row: {
          blocked_id: string;
          blocker_id: string;
          created_at: string;
        };
        Insert: {
          blocked_id: string;
          blocker_id: string;
          created_at?: string;
        };
        Update: {
          blocked_id?: string;
          blocker_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey";
            columns: ["blocked_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey";
            columns: ["blocker_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      cities: {
        Row: {
          admin_code: string | null;
          ascii_name: string;
          country_code: string;
          id: number;
          location: unknown;
          name: string;
          population: number;
        };
        Insert: {
          admin_code?: string | null;
          ascii_name: string;
          country_code: string;
          id: number;
          location: unknown;
          name: string;
          population?: number;
        };
        Update: {
          admin_code?: string | null;
          ascii_name?: string;
          country_code?: string;
          id?: number;
          location?: unknown;
          name?: string;
          population?: number;
        };
        Relationships: [];
      };
      compatibility_config: {
        Row: {
          active: boolean;
          created_at: string;
          created_by: string | null;
          version: number;
          weights: Json;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          created_by?: string | null;
          version?: never;
          weights: Json;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          created_by?: string | null;
          version?: never;
          weights?: Json;
        };
        Relationships: [];
      };
      contact_messages: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          message: string;
          name: string;
          status: string;
          topic: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          message: string;
          name: string;
          status?: string;
          topic: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          message?: string;
          name?: string;
          status?: string;
          topic?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      country_rules: {
        Row: {
          advisory: string | null;
          allowed: boolean;
          country_code: string;
          note: string | null;
          reviewed_on: string | null;
        };
        Insert: {
          advisory?: string | null;
          allowed?: boolean;
          country_code: string;
          note?: string | null;
          reviewed_on?: string | null;
        };
        Update: {
          advisory?: string | null;
          allowed?: boolean;
          country_code?: string;
          note?: string | null;
          reviewed_on?: string | null;
        };
        Relationships: [];
      };
      daily_picks: {
        Row: {
          pick_date: string;
          pick_id: string;
          rank: number;
          reasons: Json;
          score: number;
          user_id: string;
        };
        Insert: {
          pick_date: string;
          pick_id: string;
          rank: number;
          reasons?: Json;
          score: number;
          user_id: string;
        };
        Update: {
          pick_date?: string;
          pick_id?: string;
          rank?: number;
          reasons?: Json;
          score?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_picks_pick_id_fkey";
            columns: ["pick_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_picks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      entitlements: {
        Row: {
          feature_key: string;
          limit_value: number | null;
          period: string | null;
          plan_id: string;
        };
        Insert: {
          feature_key: string;
          limit_value?: number | null;
          period?: string | null;
          plan_id: string;
        };
        Update: {
          feature_key?: string;
          limit_value?: number | null;
          period?: string | null;
          plan_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "entitlements_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
        ];
      };
      interests: {
        Row: {
          active: boolean;
          category: string;
          id: number;
          label: string;
          slug: string;
        };
        Insert: {
          active?: boolean;
          category: string;
          id?: never;
          label: string;
          slug: string;
        };
        Update: {
          active?: boolean;
          category?: string;
          id?: never;
          label?: string;
          slug?: string;
        };
        Relationships: [];
      };
      lifestyle: {
        Row: {
          diet: string | null;
          drinking: string | null;
          exercise: string | null;
          kids: string | null;
          pets: string | null;
          profile_id: string;
          religion: string | null;
          smoking: string | null;
          updated_at: string;
        };
        Insert: {
          diet?: string | null;
          drinking?: string | null;
          exercise?: string | null;
          kids?: string | null;
          pets?: string | null;
          profile_id: string;
          religion?: string | null;
          smoking?: string | null;
          updated_at?: string;
        };
        Update: {
          diet?: string | null;
          drinking?: string | null;
          exercise?: string | null;
          kids?: string | null;
          pets?: string | null;
          profile_id?: string;
          religion?: string | null;
          smoking?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lifestyle_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      likes: {
        Row: {
          created_at: string;
          from_id: string;
          kind: Database["public"]["Enums"]["like_kind"];
          note: string | null;
          to_id: string;
        };
        Insert: {
          created_at?: string;
          from_id: string;
          kind?: Database["public"]["Enums"]["like_kind"];
          note?: string | null;
          to_id: string;
        };
        Update: {
          created_at?: string;
          from_id?: string;
          kind?: Database["public"]["Enums"]["like_kind"];
          note?: string | null;
          to_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "likes_from_id_fkey";
            columns: ["from_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "likes_to_id_fkey";
            columns: ["to_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      match_reads: {
        Row: {
          last_read_at: string;
          match_id: string;
          profile_id: string;
        };
        Insert: {
          last_read_at?: string;
          match_id: string;
          profile_id: string;
        };
        Update: {
          last_read_at?: string;
          match_id?: string;
          profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "match_reads_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_reads_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      matches: {
        Row: {
          created_at: string;
          ended_at: string | null;
          ended_by: string | null;
          ended_reason: Database["public"]["Enums"]["match_end_reason"] | null;
          id: string;
          last_message_at: string | null;
          user_a: string;
          user_b: string;
        };
        Insert: {
          created_at?: string;
          ended_at?: string | null;
          ended_by?: string | null;
          ended_reason?: Database["public"]["Enums"]["match_end_reason"] | null;
          id?: string;
          last_message_at?: string | null;
          user_a: string;
          user_b: string;
        };
        Update: {
          created_at?: string;
          ended_at?: string | null;
          ended_by?: string | null;
          ended_reason?: Database["public"]["Enums"]["match_end_reason"] | null;
          id?: string;
          last_message_at?: string | null;
          user_a?: string;
          user_b?: string;
        };
        Relationships: [
          {
            foreignKeyName: "matches_ended_by_fkey";
            columns: ["ended_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_user_a_fkey";
            columns: ["user_a"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_user_b_fkey";
            columns: ["user_b"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          body: string;
          client_id: string;
          created_at: string;
          id: string;
          match_id: string;
          sender_id: string;
        };
        Insert: {
          body: string;
          client_id: string;
          created_at?: string;
          id?: string;
          match_id: string;
          sender_id: string;
        };
        Update: {
          body?: string;
          client_id?: string;
          created_at?: string;
          id?: string;
          match_id?: string;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_outbox: {
        Row: {
          attempts: number;
          channel: Database["public"]["Enums"]["notification_channel"];
          claimed_at: string | null;
          created_at: string;
          id: number;
          kind: Database["public"]["Enums"]["notification_kind"];
          last_error: string | null;
          profile_id: string;
          ref_id: string;
          send_after: string;
          sent_at: string | null;
          skipped: string | null;
        };
        Insert: {
          attempts?: number;
          channel?: Database["public"]["Enums"]["notification_channel"];
          claimed_at?: string | null;
          created_at?: string;
          id?: never;
          kind: Database["public"]["Enums"]["notification_kind"];
          last_error?: string | null;
          profile_id: string;
          ref_id: string;
          send_after?: string;
          sent_at?: string | null;
          skipped?: string | null;
        };
        Update: {
          attempts?: number;
          channel?: Database["public"]["Enums"]["notification_channel"];
          claimed_at?: string | null;
          created_at?: string;
          id?: never;
          kind?: Database["public"]["Enums"]["notification_kind"];
          last_error?: string | null;
          profile_id?: string;
          ref_id?: string;
          send_after?: string;
          sent_at?: string | null;
          skipped?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notification_outbox_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_settings: {
        Row: {
          email_matches: boolean;
          email_messages: boolean;
          profile_id: string;
          push_matches: boolean;
          push_messages: boolean;
          updated_at: string;
        };
        Insert: {
          email_matches?: boolean;
          email_messages?: boolean;
          profile_id: string;
          push_matches?: boolean;
          push_messages?: boolean;
          updated_at?: string;
        };
        Update: {
          email_matches?: boolean;
          email_messages?: boolean;
          profile_id?: string;
          push_matches?: boolean;
          push_messages?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_settings_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      passes: {
        Row: {
          created_at: string;
          from_id: string;
          to_id: string;
        };
        Insert: {
          created_at?: string;
          from_id: string;
          to_id: string;
        };
        Update: {
          created_at?: string;
          from_id?: string;
          to_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "passes_from_id_fkey";
            columns: ["from_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "passes_to_id_fkey";
            columns: ["to_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_events: {
        Row: {
          event_type: string;
          payload: Json;
          provider: string;
          provider_event_id: string;
          received_at: string;
        };
        Insert: {
          event_type: string;
          payload: Json;
          provider?: string;
          provider_event_id: string;
          received_at?: string;
        };
        Update: {
          event_type?: string;
          payload?: Json;
          provider?: string;
          provider_event_id?: string;
          received_at?: string;
        };
        Relationships: [];
      };
      photos: {
        Row: {
          blurhash: string | null;
          created_at: string;
          height: number | null;
          id: string;
          moderation_note: string | null;
          moderation_status: Database["public"]["Enums"]["moderation_status"];
          position: number;
          profile_id: string;
          storage_path: string;
          width: number | null;
        };
        Insert: {
          blurhash?: string | null;
          created_at?: string;
          height?: number | null;
          id?: string;
          moderation_note?: string | null;
          moderation_status?: Database["public"]["Enums"]["moderation_status"];
          position: number;
          profile_id: string;
          storage_path: string;
          width?: number | null;
        };
        Update: {
          blurhash?: string | null;
          created_at?: string;
          height?: number | null;
          id?: string;
          moderation_note?: string | null;
          moderation_status?: Database["public"]["Enums"]["moderation_status"];
          position?: number;
          profile_id?: string;
          storage_path?: string;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "photos_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      plan_prices: {
        Row: {
          active: boolean;
          amount_minor: number;
          created_at: string;
          currency: string;
          id: string;
          period_months: number;
          plan_id: string;
          provider: string | null;
          provider_plan_id: string | null;
        };
        Insert: {
          active?: boolean;
          amount_minor: number;
          created_at?: string;
          currency: string;
          id?: string;
          period_months: number;
          plan_id: string;
          provider?: string | null;
          provider_plan_id?: string | null;
        };
        Update: {
          active?: boolean;
          amount_minor?: number;
          created_at?: string;
          currency?: string;
          id?: string;
          period_months?: number;
          plan_id?: string;
          provider?: string | null;
          provider_plan_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "plan_prices_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
        ];
      };
      plans: {
        Row: {
          active: boolean;
          code: string;
          created_at: string;
          description: string | null;
          id: string;
          is_free: boolean;
          name: string;
          sort_order: number;
        };
        Insert: {
          active?: boolean;
          code: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_free?: boolean;
          name: string;
          sort_order?: number;
        };
        Update: {
          active?: boolean;
          code?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_free?: boolean;
          name?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      preferences: {
        Row: {
          age_max: number;
          age_min: number;
          dealbreakers: Json;
          distance_unit: string;
          intentions: Database["public"]["Enums"]["relationship_intention"][];
          max_distance_km: number;
          profile_id: string;
          show_genders: string[];
          updated_at: string;
          weights: Json;
        };
        Insert: {
          age_max?: number;
          age_min?: number;
          dealbreakers?: Json;
          distance_unit?: string;
          intentions?: Database["public"]["Enums"]["relationship_intention"][];
          max_distance_km?: number;
          profile_id: string;
          show_genders?: string[];
          updated_at?: string;
          weights?: Json;
        };
        Update: {
          age_max?: number;
          age_min?: number;
          dealbreakers?: Json;
          distance_unit?: string;
          intentions?: Database["public"]["Enums"]["relationship_intention"][];
          max_distance_km?: number;
          profile_id?: string;
          show_genders?: string[];
          updated_at?: string;
          weights?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "preferences_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      privacy_settings: {
        Row: {
          hide_age: boolean;
          hide_distance: boolean;
          profile_id: string;
          send_read_receipts: boolean;
          show_last_active: boolean;
          show_online_status: boolean;
          updated_at: string;
        };
        Insert: {
          hide_age?: boolean;
          hide_distance?: boolean;
          profile_id: string;
          send_read_receipts?: boolean;
          show_last_active?: boolean;
          show_online_status?: boolean;
          updated_at?: string;
        };
        Update: {
          hide_age?: boolean;
          hide_distance?: boolean;
          profile_id?: string;
          send_read_receipts?: boolean;
          show_last_active?: boolean;
          show_online_status?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "privacy_settings_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profile_interests: {
        Row: {
          interest_id: number;
          profile_id: string;
        };
        Insert: {
          interest_id: number;
          profile_id: string;
        };
        Update: {
          interest_id?: number;
          profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profile_interests_interest_id_fkey";
            columns: ["interest_id"];
            isOneToOne: false;
            referencedRelation: "interests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profile_interests_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profile_private: {
        Row: {
          birth_date: string | null;
          created_at: string;
          deletion_requested_at: string | null;
          location: unknown;
          marketing_consent: boolean;
          phone_e164: string | null;
          phone_verified_at: string | null;
          privacy_accepted_at: string | null;
          profile_id: string;
          status_before_deletion:
            Database["public"]["Enums"]["profile_status"] | null;
          terms_accepted_at: string | null;
          timezone: string | null;
          updated_at: string;
        };
        Insert: {
          birth_date?: string | null;
          created_at?: string;
          deletion_requested_at?: string | null;
          location?: unknown;
          marketing_consent?: boolean;
          phone_e164?: string | null;
          phone_verified_at?: string | null;
          privacy_accepted_at?: string | null;
          profile_id: string;
          status_before_deletion?:
            Database["public"]["Enums"]["profile_status"] | null;
          terms_accepted_at?: string | null;
          timezone?: string | null;
          updated_at?: string;
        };
        Update: {
          birth_date?: string | null;
          created_at?: string;
          deletion_requested_at?: string | null;
          location?: unknown;
          marketing_consent?: boolean;
          phone_e164?: string | null;
          phone_verified_at?: string | null;
          privacy_accepted_at?: string | null;
          profile_id?: string;
          status_before_deletion?:
            Database["public"]["Enums"]["profile_status"] | null;
          terms_accepted_at?: string | null;
          timezone?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profile_private_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profile_prompts: {
        Row: {
          answer: string;
          position: number;
          profile_id: string;
          prompt_id: number;
        };
        Insert: {
          answer: string;
          position: number;
          profile_id: string;
          prompt_id: number;
        };
        Update: {
          answer?: string;
          position?: number;
          profile_id?: string;
          prompt_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "profile_prompts_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profile_prompts_prompt_id_fkey";
            columns: ["prompt_id"];
            isOneToOne: false;
            referencedRelation: "prompts";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          bio: string | null;
          city: string | null;
          country_code: string | null;
          created_at: string;
          display_name: string | null;
          education: string | null;
          gender_group: string | null;
          gender_identity: string | null;
          id: string;
          intention:
            Database["public"]["Enums"]["relationship_intention"] | null;
          is_incognito: boolean;
          job_title: string | null;
          last_active_at: string;
          onboarding_step: number;
          pronouns: string | null;
          status: Database["public"]["Enums"]["profile_status"];
          status_reason: string | null;
          updated_at: string;
          verified_at: string | null;
        };
        Insert: {
          bio?: string | null;
          city?: string | null;
          country_code?: string | null;
          created_at?: string;
          display_name?: string | null;
          education?: string | null;
          gender_group?: string | null;
          gender_identity?: string | null;
          id: string;
          intention?:
            Database["public"]["Enums"]["relationship_intention"] | null;
          is_incognito?: boolean;
          job_title?: string | null;
          last_active_at?: string;
          onboarding_step?: number;
          pronouns?: string | null;
          status?: Database["public"]["Enums"]["profile_status"];
          status_reason?: string | null;
          updated_at?: string;
          verified_at?: string | null;
        };
        Update: {
          bio?: string | null;
          city?: string | null;
          country_code?: string | null;
          created_at?: string;
          display_name?: string | null;
          education?: string | null;
          gender_group?: string | null;
          gender_identity?: string | null;
          id?: string;
          intention?:
            Database["public"]["Enums"]["relationship_intention"] | null;
          is_incognito?: boolean;
          job_title?: string | null;
          last_active_at?: string;
          onboarding_step?: number;
          pronouns?: string | null;
          status?: Database["public"]["Enums"]["profile_status"];
          status_reason?: string | null;
          updated_at?: string;
          verified_at?: string | null;
        };
        Relationships: [];
      };
      prompts: {
        Row: {
          active: boolean;
          id: number;
          text: string;
        };
        Insert: {
          active?: boolean;
          id?: never;
          text: string;
        };
        Update: {
          active?: boolean;
          id?: never;
          text?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          endpoint: string;
          id: string;
          last_used_at: string | null;
          p256dh: string;
          profile_id: string;
          user_agent: string | null;
        };
        Insert: {
          auth: string;
          created_at?: string;
          endpoint: string;
          id?: string;
          last_used_at?: string | null;
          p256dh: string;
          profile_id: string;
          user_agent?: string | null;
        };
        Update: {
          auth?: string;
          created_at?: string;
          endpoint?: string;
          id?: string;
          last_used_at?: string | null;
          p256dh?: string;
          profile_id?: string;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          action: string | null;
          created_at: string;
          details: string | null;
          id: string;
          match_id: string | null;
          message_id: string | null;
          priority: Database["public"]["Enums"]["report_priority"];
          reason: Database["public"]["Enums"]["report_reason"];
          reported_id: string | null;
          reporter_id: string | null;
          resolution: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database["public"]["Enums"]["report_status"];
        };
        Insert: {
          action?: string | null;
          created_at?: string;
          details?: string | null;
          id?: string;
          match_id?: string | null;
          message_id?: string | null;
          priority?: Database["public"]["Enums"]["report_priority"];
          reason: Database["public"]["Enums"]["report_reason"];
          reported_id?: string | null;
          reporter_id?: string | null;
          resolution?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["report_status"];
        };
        Update: {
          action?: string | null;
          created_at?: string;
          details?: string | null;
          id?: string;
          match_id?: string | null;
          message_id?: string | null;
          priority?: Database["public"]["Enums"]["report_priority"];
          reason?: Database["public"]["Enums"]["report_reason"];
          reported_id?: string | null;
          reporter_id?: string | null;
          resolution?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["report_status"];
        };
        Relationships: [
          {
            foreignKeyName: "reports_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_reported_id_fkey";
            columns: ["reported_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      safety_notices: {
        Row: {
          created_at: string;
          dismissed_at: string | null;
          id: string;
          kind: Database["public"]["Enums"]["safety_notice_kind"];
          last_contact_at: string | null;
          profile_id: string;
          reason: Database["public"]["Enums"]["report_reason"] | null;
          subject_id: string | null;
          subject_name: string | null;
        };
        Insert: {
          created_at?: string;
          dismissed_at?: string | null;
          id?: string;
          kind: Database["public"]["Enums"]["safety_notice_kind"];
          last_contact_at?: string | null;
          profile_id: string;
          reason?: Database["public"]["Enums"]["report_reason"] | null;
          subject_id?: string | null;
          subject_name?: string | null;
        };
        Update: {
          created_at?: string;
          dismissed_at?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["safety_notice_kind"];
          last_contact_at?: string | null;
          profile_id?: string;
          reason?: Database["public"]["Enums"]["report_reason"] | null;
          subject_id?: string | null;
          subject_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "safety_notices_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "safety_notices_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_roles: {
        Row: {
          created_at: string;
          granted_by: string | null;
          role: Database["public"]["Enums"]["staff_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          granted_by?: string | null;
          role: Database["public"]["Enums"]["staff_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          granted_by?: string | null;
          role?: Database["public"]["Enums"]["staff_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean;
          created_at: string;
          current_period_end: string | null;
          id: string;
          plan_id: string;
          price_id: string | null;
          profile_id: string;
          provider: string;
          provider_subscription_id: string;
          status: Database["public"]["Enums"]["subscription_status"];
          updated_at: string;
        };
        Insert: {
          cancel_at_period_end?: boolean;
          created_at?: string;
          current_period_end?: string | null;
          id?: string;
          plan_id: string;
          price_id?: string | null;
          profile_id: string;
          provider?: string;
          provider_subscription_id: string;
          status?: Database["public"]["Enums"]["subscription_status"];
          updated_at?: string;
        };
        Update: {
          cancel_at_period_end?: boolean;
          created_at?: string;
          current_period_end?: string | null;
          id?: string;
          plan_id?: string;
          price_id?: string | null;
          profile_id?: string;
          provider?: string;
          provider_subscription_id?: string;
          status?: Database["public"]["Enums"]["subscription_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_price_id_fkey";
            columns: ["price_id"];
            isOneToOne: false;
            referencedRelation: "plan_prices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      verification_requests: {
        Row: {
          created_at: string;
          id: string;
          note: string | null;
          pose: string;
          profile_id: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database["public"]["Enums"]["verification_status"];
          storage_path: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          note?: string | null;
          pose: string;
          profile_id: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["verification_status"];
          storage_path?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          note?: string | null;
          pose?: string;
          profile_id?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["verification_status"];
          storage_path?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "verification_requests_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_terms: { Args: { p_marketing?: boolean }; Returns: undefined };
      age_in_years: { Args: { birth: string }; Returns: number };
      claim_notifications: {
        Args: { p_limit?: number };
        Returns: {
          channel: Database["public"]["Enums"]["notification_channel"];
          email: string;
          id: number;
          kind: Database["public"]["Enums"]["notification_kind"];
          last_contact_at: string;
          other_name: string;
          profile_id: string;
          recipient_name: string;
          ref_id: string;
          timezone: string;
        }[];
      };
      compact_photo_positions: { Args: never; Returns: undefined };
      complete_notification: {
        Args: { p_error?: string; p_id: number; p_ok: boolean };
        Returns: undefined;
      };
      complete_onboarding: { Args: never; Returns: undefined };
      conversation_seen_at: { Args: { p_match_id: string }; Returns: string };
      create_report: {
        Args: {
          p_block?: boolean;
          p_details?: string;
          p_match_id?: string;
          p_message_id?: string;
          p_reason: Database["public"]["Enums"]["report_reason"];
          p_reported: string;
        };
        Returns: string;
      };
      discover: {
        Args: { p_filters?: Json; p_limit?: number; p_offset?: number };
        Returns: {
          profile_id: string;
          reasons: Json;
          score: number;
        }[];
      };
      dismiss_safety_notice: { Args: { p_id: string }; Returns: undefined };
      export_my_data: { Args: never; Returns: Json };
      get_daily_picks: {
        Args: never;
        Returns: {
          profile_id: string;
          reasons: Json;
          score: number;
        }[];
      };
      likes_received_summary: { Args: never; Returns: Json };
      mark_conversation_read: {
        Args: { p_match_id: string };
        Returns: undefined;
      };
      my_conversations: {
        Args: never;
        Returns: {
          last_message_at: string;
          last_message_mine: boolean;
          last_message_preview: string;
          match_id: string;
          matched_at: string;
          other_id: string;
          unread_count: number;
        }[];
      };
      my_features: { Args: never; Returns: Json };
      my_membership: { Args: never; Returns: Json };
      my_safety_advisory: { Args: never; Returns: Json };
      my_staff_roles: { Args: never; Returns: string[] };
      next_photo_position: { Args: never; Returns: number };
      notifications_due: { Args: never; Returns: boolean };
      orphaned_storage_files: {
        Args: { p_limit?: number };
        Returns: {
          bucket: string;
          path: string;
        }[];
      };
      profile_age: { Args: { target: string }; Returns: number };
      profile_cards: { Args: { p_ids: string[] }; Returns: Json };
      push_result: {
        Args: { p_gone?: boolean; p_id: string; p_ok: boolean };
        Returns: undefined;
      };
      push_targets: {
        Args: { p_profile: string };
        Returns: {
          auth: string;
          endpoint: string;
          id: string;
          p256dh: string;
        }[];
      };
      rate_limit_hit: {
        Args: {
          p_bucket: string;
          p_key_hash: string;
          p_max: number;
          p_window_seconds: number;
        };
        Returns: boolean;
      };
      reorder_photos: { Args: { p_ids: string[] }; Returns: undefined };
      request_account_deletion: { Args: never; Returns: undefined };
      restore_account: { Args: never; Returns: undefined };
      save_push_subscription: {
        Args: {
          p_auth: string;
          p_endpoint: string;
          p_p256dh: string;
          p_user_agent?: string;
        };
        Returns: undefined;
      };
      search_cities: {
        Args: { p_limit?: number; p_query: string };
        Returns: {
          admin_code: string;
          country_code: string;
          id: number;
          name: string;
          population: number;
        }[];
      };
      send_message: {
        Args: { p_body: string; p_client_id: string; p_match_id: string };
        Returns: {
          body: string;
          client_id: string;
          created_at: string;
          id: string;
          match_id: string;
          sender_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "messages";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_incognito: { Args: { p_on: boolean }; Returns: undefined };
      set_location: {
        Args: {
          p_city_id?: number;
          p_lat?: number;
          p_lng?: number;
          p_timezone?: string;
        };
        Returns: Json;
      };
      set_notification_settings: {
        Args: { p_email_matches: boolean; p_email_messages: boolean };
        Returns: undefined;
      };
      set_paused: { Args: { p_paused: boolean }; Returns: undefined };
      set_profile_interests: { Args: { p_ids: number[] }; Returns: undefined };
      set_profile_prompts: { Args: { p_answers: Json }; Returns: undefined };
      set_push_settings: {
        Args: { p_push_matches: boolean; p_push_messages: boolean };
        Returns: undefined;
      };
      set_timezone: { Args: { p_timezone: string }; Returns: undefined };
      staff_decide_verification: {
        Args: { p_approve: boolean; p_note?: string; p_request: string };
        Returns: string;
      };
      staff_list_reports: {
        Args: {
          p_limit?: number;
          p_status?: Database["public"]["Enums"]["report_status"];
        };
        Returns: {
          created_at: string;
          details: string;
          priority: Database["public"]["Enums"]["report_priority"];
          reason: Database["public"]["Enums"]["report_reason"];
          report_id: string;
          reported_id: string;
          reported_name: string;
          reported_status: Database["public"]["Enums"]["profile_status"];
          reporter_id: string;
          reporter_name: string;
          reports_against: number;
          status: Database["public"]["Enums"]["report_status"];
        }[];
      };
      staff_moderate_photo: {
        Args: { p_approve: boolean; p_note?: string; p_photo: string };
        Returns: undefined;
      };
      staff_pending_photos: {
        Args: { p_limit?: number };
        Returns: {
          display_name: string;
          photo_id: string;
          profile_id: string;
          profile_status: Database["public"]["Enums"]["profile_status"];
          storage_path: string;
          uploaded_at: string;
        }[];
      };
      staff_pending_verifications: {
        Args: { p_limit?: number };
        Returns: {
          display_name: string;
          photo_paths: string[];
          pose: string;
          profile_id: string;
          request_id: string;
          selfie_path: string;
          submitted_at: string;
        }[];
      };
      staff_queue_counts: { Args: never; Returns: Json };
      staff_report_detail: { Args: { p_report: string }; Returns: Json };
      staff_resolve_report: {
        Args: {
          p_action: string;
          p_fraud?: boolean;
          p_note: string;
          p_report: string;
        };
        Returns: Json;
      };
      staff_set_profile_status: {
        Args: {
          new_status: Database["public"]["Enums"]["profile_status"];
          reason: string;
          target: string;
        };
        Returns: undefined;
      };
      start_verification: {
        Args: never;
        Returns: {
          created_at: string;
          id: string;
          note: string | null;
          pose: string;
          profile_id: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database["public"]["Enums"]["verification_status"];
          storage_path: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "verification_requests";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      submit_birth_date: { Args: { p_birth_date: string }; Returns: boolean };
      submit_verification: {
        Args: { p_path: string; p_request: string };
        Returns: undefined;
      };
      swipe: {
        Args: { p_action: string; p_note?: string; p_target: string };
        Returns: Json;
      };
      touch_last_active: { Args: never; Returns: undefined };
      undo_last_pass: { Args: never; Returns: string };
      unmatch: { Args: { p_match_id: string }; Returns: undefined };
      unread_conversations_count: { Args: never; Returns: number };
      update_subscription_status: {
        Args: {
          p_current_period_end?: string;
          p_provider_subscription_id: string;
          p_status: Database["public"]["Enums"]["subscription_status"];
        };
        Returns: boolean;
      };
      upsert_subscription: {
        Args: {
          p_cancel_at_period_end?: boolean;
          p_current_period_end?: string;
          p_price: string;
          p_profile: string;
          p_provider_subscription_id: string;
          p_status: Database["public"]["Enums"]["subscription_status"];
        };
        Returns: string;
      };
      verified_profiles: { Args: { p_ids: string[] }; Returns: string[] };
      write_audit_log: {
        Args: {
          p_action: string;
          p_after?: Json;
          p_before?: Json;
          p_target_id: string;
          p_target_type: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      affection_pace: "slow" | "steady" | "quick";
      cuddle_style: "big_spoon" | "little_spoon" | "either" | "not_sure";
      like_kind: "like" | "super";
      match_end_reason: "unmatch" | "block" | "moderation" | "account_deleted";
      moderation_status: "pending" | "approved" | "rejected";
      notification_channel: "email" | "push";
      notification_kind: "match" | "message" | "fraud_ban";
      profile_status:
        "onboarding" | "active" | "paused" | "suspended" | "banned" | "deleted";
      relationship_intention:
        | "life_partner"
        | "long_term"
        | "long_term_open"
        | "short_term_open"
        | "figuring_out";
      report_priority: "normal" | "urgent";
      report_reason:
        | "fake_profile"
        | "scam"
        | "harassment"
        | "inappropriate_content"
        | "hate"
        | "underage"
        | "offline_safety"
        | "spam"
        | "other";
      report_status: "open" | "actioned" | "dismissed";
      safety_notice_kind: "warning" | "fraud_ban";
      staff_role: "admin" | "moderator" | "support";
      subscription_status:
        | "created"
        | "authenticated"
        | "active"
        | "pending"
        | "halted"
        | "cancelled"
        | "completed"
        | "expired";
      verification_status:
        "awaiting_photo" | "pending" | "approved" | "rejected";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      affection_pace: ["slow", "steady", "quick"],
      cuddle_style: ["big_spoon", "little_spoon", "either", "not_sure"],
      like_kind: ["like", "super"],
      match_end_reason: ["unmatch", "block", "moderation", "account_deleted"],
      moderation_status: ["pending", "approved", "rejected"],
      notification_channel: ["email", "push"],
      notification_kind: ["match", "message", "fraud_ban"],
      profile_status: [
        "onboarding",
        "active",
        "paused",
        "suspended",
        "banned",
        "deleted",
      ],
      relationship_intention: [
        "life_partner",
        "long_term",
        "long_term_open",
        "short_term_open",
        "figuring_out",
      ],
      report_priority: ["normal", "urgent"],
      report_reason: [
        "fake_profile",
        "scam",
        "harassment",
        "inappropriate_content",
        "hate",
        "underage",
        "offline_safety",
        "spam",
        "other",
      ],
      report_status: ["open", "actioned", "dismissed"],
      safety_notice_kind: ["warning", "fraud_ban"],
      staff_role: ["admin", "moderator", "support"],
      subscription_status: [
        "created",
        "authenticated",
        "active",
        "pending",
        "halted",
        "cancelled",
        "completed",
        "expired",
      ],
      verification_status: [
        "awaiting_photo",
        "pending",
        "approved",
        "rejected",
      ],
    },
  },
} as const;
