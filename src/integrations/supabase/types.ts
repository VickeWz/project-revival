export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          active_minutes: number
          created_at: string
          distance_meters: number
          id: string
          logged_at: string
          screen_time_earned: number
          steps: number
          user_id: string
        }
        Insert: {
          active_minutes?: number
          created_at?: string
          distance_meters?: number
          id?: string
          logged_at?: string
          screen_time_earned?: number
          steps?: number
          user_id: string
        }
        Update: {
          active_minutes?: number
          created_at?: string
          distance_meters?: number
          id?: string
          logged_at?: string
          screen_time_earned?: number
          steps?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      always_allowed_apps: {
        Row: {
          app_icon: string | null
          app_name: string
          category: string
          child_id: string
          created_at: string
          id: string
          parent_id: string
        }
        Insert: {
          app_icon?: string | null
          app_name: string
          category?: string
          child_id: string
          created_at?: string
          id?: string
          parent_id: string
        }
        Update: {
          app_icon?: string | null
          app_name?: string
          category?: string
          child_id?: string
          created_at?: string
          id?: string
          parent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "always_allowed_apps_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "always_allowed_apps_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_limits: {
        Row: {
          app_icon: string | null
          app_name: string
          category: string
          child_id: string
          created_at: string
          daily_limit_minutes: number
          id: string
          is_enabled: boolean
          parent_id: string
        }
        Insert: {
          app_icon?: string | null
          app_name: string
          category?: string
          child_id: string
          created_at?: string
          daily_limit_minutes?: number
          id?: string
          is_enabled?: boolean
          parent_id: string
        }
        Update: {
          app_icon?: string | null
          app_name?: string
          category?: string
          child_id?: string
          created_at?: string
          daily_limit_minutes?: number
          id?: string
          is_enabled?: boolean
          parent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_limits_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_limits_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      completed_activity_passes: {
        Row: {
          earned_minutes: number
          ended_at: string
          id: string
          profile_id: string
          started_at: string
          steps: number
        }
        Insert: {
          earned_minutes: number
          ended_at: string
          id: string
          profile_id: string
          started_at: string
          steps: number
        }
        Update: {
          earned_minutes?: number
          ended_at?: string
          id?: string
          profile_id?: string
          started_at?: string
          steps?: number
        }
        Relationships: [
          {
            foreignKeyName: "completed_activity_passes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      downtime_schedules: {
        Row: {
          child_id: string
          created_at: string
          days_enabled: string[]
          end_time: string
          id: string
          is_enabled: boolean
          parent_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          child_id: string
          created_at?: string
          days_enabled?: string[]
          end_time?: string
          id?: string
          is_enabled?: boolean
          parent_id: string
          start_time?: string
          updated_at?: string
        }
        Update: {
          child_id?: string
          created_at?: string
          days_enabled?: string[]
          end_time?: string
          id?: string
          is_enabled?: boolean
          parent_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "downtime_schedules_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "downtime_schedules_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_child_links: {
        Row: {
          child_id: string
          created_at: string
          id: string
          parent_id: string
        }
        Insert: {
          child_id: string
          created_at?: string
          id?: string
          parent_id: string
        }
        Update: {
          child_id?: string
          created_at?: string
          id?: string
          parent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_child_links_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_child_links_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          onboarding_complete: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id?: string
          onboarding_complete?: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          onboarding_complete?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      screen_time_balance: {
        Row: {
          id: string
          last_updated: string
          minutes_remaining: number
          user_id: string
        }
        Insert: {
          id?: string
          last_updated?: string
          minutes_remaining?: number
          user_id: string
        }
        Update: {
          id?: string
          last_updated?: string
          minutes_remaining?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "screen_time_balance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      screen_time_requests: {
        Row: {
          child_id: string
          created_at: string
          id: string
          parent_id: string
          requested_minutes: number
          responded_at: string | null
          status: string
        }
        Insert: {
          child_id: string
          created_at?: string
          id?: string
          parent_id: string
          requested_minutes?: number
          responded_at?: string | null
          status?: string
        }
        Update: {
          child_id?: string
          created_at?: string
          id?: string
          parent_id?: string
          requested_minutes?: number
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "screen_time_requests_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_time_requests_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      screen_time_sessions: {
        Row: {
          balance_after: number
          device_id: string
          expires_at: string
          id: string
          minutes: number
          profile_id: string
          started_at: string
        }
        Insert: {
          balance_after: number
          device_id: string
          expires_at: string
          id: string
          minutes: number
          profile_id: string
          started_at?: string
        }
        Update: {
          balance_after?: number
          device_id?: string
          expires_at?: string
          id?: string
          minutes?: number
          profile_id?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "screen_time_sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_step_pass: {
        Args: {
          p_active_minutes: number
          p_day: string
          p_distance: number
          p_ended_at: string
          p_id: string
          p_started_at: string
          p_steps: number
        }
        Returns: Json
      }
      is_child_of_profile: { Args: { profile_id: string }; Returns: boolean }
      is_parent_of_profile: { Args: { profile_id: string }; Returns: boolean }
      owns_profile: { Args: { profile_id: string }; Returns: boolean }
      redeem_screen_time: {
        Args: { p_device_id: string; p_id: string; p_minutes: number }
        Returns: Json
      }
    }
    Enums: {
      user_role: "parent" | "child"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["parent", "child"],
    },
  },
} as const
