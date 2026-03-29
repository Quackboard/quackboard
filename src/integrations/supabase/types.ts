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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          account_name: string
          bio_markdown: string | null
          created_at: string | null
          discoverable: boolean | null
          event_window_days: number | null
          header_image_url: string | null
          id: string
          instagram: string | null
          plan_tier: string | null
          profile_image_url: string | null
          slug: string
          updated_at: string | null
          venue_address: string | null
          venue_name: string | null
          website: string | null
        }
        Insert: {
          account_name: string
          bio_markdown?: string | null
          created_at?: string | null
          discoverable?: boolean | null
          event_window_days?: number | null
          header_image_url?: string | null
          id?: string
          instagram?: string | null
          plan_tier?: string | null
          profile_image_url?: string | null
          slug: string
          updated_at?: string | null
          venue_address?: string | null
          venue_name?: string | null
          website?: string | null
        }
        Update: {
          account_name?: string
          bio_markdown?: string | null
          created_at?: string | null
          discoverable?: boolean | null
          event_window_days?: number | null
          header_image_url?: string | null
          id?: string
          instagram?: string | null
          plan_tier?: string | null
          profile_image_url?: string | null
          slug?: string
          updated_at?: string | null
          venue_address?: string | null
          venue_name?: string | null
          website?: string | null
        }
        Relationships: []
      }
      accounts_users: {
        Row: {
          account_id: string
          created_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_users_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_access_codes: {
        Row: {
          code: string
          created_at: string | null
          current_uses: number | null
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          cancel_token: string
          cancelled_at: string | null
          comic_profile_id: string | null
          created_at: string | null
          event_id: string | null
          guest_email: string
          guest_instagram: string | null
          guest_name: string
          id: string
          slot_position: number
        }
        Insert: {
          cancel_token?: string
          cancelled_at?: string | null
          comic_profile_id?: string | null
          created_at?: string | null
          event_id?: string | null
          guest_email: string
          guest_instagram?: string | null
          guest_name: string
          id?: string
          slot_position: number
        }
        Update: {
          cancel_token?: string
          cancelled_at?: string | null
          comic_profile_id?: string | null
          created_at?: string | null
          event_id?: string | null
          guest_email?: string
          guest_instagram?: string | null
          guest_name?: string
          id?: string
          slot_position?: number
        }
        Relationships: [
          {
            foreignKeyName: "bookings_comic_profile_id_fkey"
            columns: ["comic_profile_id"]
            isOneToOne: false
            referencedRelation: "comic_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_availability"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "bookings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      comic_profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          instagram: string | null
          name: string | null
          password_hash: string | null
          subscription_tier: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          instagram?: string | null
          name?: string | null
          password_hash?: string | null
          subscription_tier?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          instagram?: string | null
          name?: string | null
          password_hash?: string | null
          subscription_tier?: string | null
        }
        Relationships: []
      }
      event_templates: {
        Row: {
          allow_multiple_slots: boolean | null
          created_at: string | null
          description: string | null
          end_time: string
          id: string
          is_active: boolean | null
          producer_id: string | null
          producer_message: string | null
          publish_at: string | null
          recurrence_end_date: string | null
          recurrence_rule: Json | null
          sections_config: Json
          series_id: string
          signup_anchor_day: number | null
          signup_anchor_time: string | null
          signup_opens_hours_before: number | null
          start_time: string
          title: string
          venue_address: string
          venue_name: string
        }
        Insert: {
          allow_multiple_slots?: boolean | null
          created_at?: string | null
          description?: string | null
          end_time: string
          id?: string
          is_active?: boolean | null
          producer_id?: string | null
          producer_message?: string | null
          publish_at?: string | null
          recurrence_end_date?: string | null
          recurrence_rule?: Json | null
          sections_config?: Json
          series_id?: string
          signup_anchor_day?: number | null
          signup_anchor_time?: string | null
          signup_opens_hours_before?: number | null
          start_time: string
          title: string
          venue_address: string
          venue_name: string
        }
        Update: {
          allow_multiple_slots?: boolean | null
          created_at?: string | null
          description?: string | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          producer_id?: string | null
          producer_message?: string | null
          publish_at?: string | null
          recurrence_end_date?: string | null
          recurrence_rule?: Json | null
          sections_config?: Json
          series_id?: string
          signup_anchor_day?: number | null
          signup_anchor_time?: string | null
          signup_opens_hours_before?: number | null
          start_time?: string
          title?: string
          venue_address?: string
          venue_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_templates_host_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          allow_multiple_slots: boolean | null
          city: string | null
          created_at: string | null
          date: string
          description: string | null
          email_frequency: string | null
          end_time: string
          id: string
          instagram_url: string | null
          is_info_only: boolean | null
          latitude: number | null
          longitude: number | null
          producer_id: string | null
          producer_message: string | null
          publish_at: string | null
          sections_config: Json
          series_id: string | null
          signup_opens_at: string | null
          source_link: string | null
          start_time: string
          status: string | null
          template_id: string | null
          title: string
          type: string | null
          venue_address: string
          venue_name: string
        }
        Insert: {
          allow_multiple_slots?: boolean | null
          city?: string | null
          created_at?: string | null
          date: string
          description?: string | null
          email_frequency?: string | null
          end_time: string
          id?: string
          instagram_url?: string | null
          is_info_only?: boolean | null
          latitude?: number | null
          longitude?: number | null
          producer_id?: string | null
          producer_message?: string | null
          publish_at?: string | null
          sections_config?: Json
          series_id?: string | null
          signup_opens_at?: string | null
          source_link?: string | null
          start_time: string
          status?: string | null
          template_id?: string | null
          title: string
          type?: string | null
          venue_address: string
          venue_name: string
        }
        Update: {
          allow_multiple_slots?: boolean | null
          city?: string | null
          created_at?: string | null
          date?: string
          description?: string | null
          email_frequency?: string | null
          end_time?: string
          id?: string
          instagram_url?: string | null
          is_info_only?: boolean | null
          latitude?: number | null
          longitude?: number | null
          producer_id?: string | null
          producer_message?: string | null
          publish_at?: string | null
          sections_config?: Json
          series_id?: string | null
          signup_opens_at?: string | null
          source_link?: string | null
          start_time?: string
          status?: string | null
          template_id?: string | null
          title?: string
          type?: string | null
          venue_address?: string
          venue_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_host_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "event_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      message_logs: {
        Row: {
          booking_id: string | null
          delivery_status: string | null
          email_address: string
          error_message: string | null
          id: string
          message_type: string
          producer_id: string | null
          scheduled_message_id: string | null
          sent_at: string | null
          subject: string
        }
        Insert: {
          booking_id?: string | null
          delivery_status?: string | null
          email_address: string
          error_message?: string | null
          id?: string
          message_type: string
          producer_id?: string | null
          scheduled_message_id?: string | null
          sent_at?: string | null
          subject: string
        }
        Update: {
          booking_id?: string | null
          delivery_status?: string | null
          email_address?: string
          error_message?: string | null
          id?: string
          message_type?: string
          producer_id?: string | null
          scheduled_message_id?: string | null
          sent_at?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_scheduled_message_id_fkey"
            columns: ["scheduled_message_id"]
            isOneToOne: false
            referencedRelation: "scheduled_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          body_markdown: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          producer_id: string | null
          subject: string
          trigger_hours: number | null
          trigger_type: string | null
        }
        Insert: {
          body_markdown: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          producer_id?: string | null
          subject: string
          trigger_hours?: number | null
          trigger_type?: string | null
        }
        Update: {
          body_markdown?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          producer_id?: string | null
          subject?: string
          trigger_hours?: number | null
          trigger_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_host_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
        ]
      }
      mic_submissions: {
        Row: {
          city: string | null
          created_at: string | null
          details: string | null
          end_time: string | null
          external_link: string | null
          id: string
          instagram_url: string | null
          mic_name: string
          next_occurrence: string | null
          recurrence: string | null
          start_time: string | null
          status: string | null
          submitter_email: string
          submitter_name: string
          venue_name: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          details?: string | null
          end_time?: string | null
          external_link?: string | null
          id?: string
          instagram_url?: string | null
          mic_name: string
          next_occurrence?: string | null
          recurrence?: string | null
          start_time?: string | null
          status?: string | null
          submitter_email: string
          submitter_name: string
          venue_name?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string | null
          details?: string | null
          end_time?: string | null
          external_link?: string | null
          id?: string
          instagram_url?: string | null
          mic_name?: string
          next_occurrence?: string | null
          recurrence?: string | null
          start_time?: string | null
          status?: string | null
          submitter_email?: string
          submitter_name?: string
          venue_name?: string | null
        }
        Relationships: []
      }
      producer_features: {
        Row: {
          feature: string
          granted_at: string
          id: string
          producer_id: string
        }
        Insert: {
          feature: string
          granted_at?: string
          id?: string
          producer_id: string
        }
        Update: {
          feature?: string
          granted_at?: string
          id?: string
          producer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "producer_features_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
        ]
      }
      producers: {
        Row: {
          bio_markdown: string | null
          created_at: string | null
          discoverable: boolean
          email: string
          event_window_days: number
          header_image_url: string | null
          id: string
          instagram: string | null
          name: string | null
          profile_image_url: string | null
          slug: string | null
          timezone: string | null
          updated_at: string | null
          venue_address: string | null
          venue_name: string | null
          website: string | null
        }
        Insert: {
          bio_markdown?: string | null
          created_at?: string | null
          discoverable?: boolean
          email: string
          event_window_days?: number
          header_image_url?: string | null
          id?: string
          instagram?: string | null
          name?: string | null
          profile_image_url?: string | null
          slug?: string | null
          timezone?: string | null
          updated_at?: string | null
          venue_address?: string | null
          venue_name?: string | null
          website?: string | null
        }
        Update: {
          bio_markdown?: string | null
          created_at?: string | null
          discoverable?: boolean
          email?: string
          event_window_days?: number
          header_image_url?: string | null
          id?: string
          instagram?: string | null
          name?: string | null
          profile_image_url?: string | null
          slug?: string | null
          timezone?: string | null
          updated_at?: string | null
          venue_address?: string | null
          venue_name?: string | null
          website?: string | null
        }
        Relationships: []
      }
      scheduled_messages: {
        Row: {
          body_markdown: string
          created_at: string | null
          event_id: string | null
          id: string
          producer_id: string | null
          recipient_filter: string | null
          recipient_slots: number[] | null
          send_at: string
          sent_at: string | null
          status: string | null
          subject: string
          template_id: string | null
        }
        Insert: {
          body_markdown: string
          created_at?: string | null
          event_id?: string | null
          id?: string
          producer_id?: string | null
          recipient_filter?: string | null
          recipient_slots?: number[] | null
          send_at: string
          sent_at?: string | null
          status?: string | null
          subject: string
          template_id?: string | null
        }
        Update: {
          body_markdown?: string
          created_at?: string | null
          event_id?: string | null
          id?: string
          producer_id?: string | null
          recipient_filter?: string | null
          recipient_slots?: number[] | null
          send_at?: string
          sent_at?: string | null
          status?: string | null
          subject?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_availability"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "scheduled_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_messages_host_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "producers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_messages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      event_availability: {
        Row: {
          booked_count: number | null
          event_id: string | null
          total_slots: number | null
        }
        Insert: {
          booked_count?: never
          event_id?: string | null
          total_slots?: never
        }
        Update: {
          booked_count?: never
          event_id?: string | null
          total_slots?: never
        }
        Relationships: []
      }
    }
    Functions: {
      validate_beta_code: { Args: { code_input: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
