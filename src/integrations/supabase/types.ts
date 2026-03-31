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
    PostgrestVersion: "14.4"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      banned_words: {
        Row: {
          created_at: string
          id: string
          word: string
        }
        Insert: {
          created_at?: string
          id?: string
          word: string
        }
        Update: {
          created_at?: string
          id?: string
          word?: string
        }
        Relationships: []
      }
      cities: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      credit_history: {
        Row: {
          appeal_reason: string | null
          appeal_status: string | null
          can_appeal: boolean
          change: number
          created_at: string
          group_id: string | null
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          appeal_reason?: string | null
          appeal_status?: string | null
          can_appeal?: boolean
          change: number
          created_at?: string
          group_id?: string | null
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          appeal_reason?: string | null
          appeal_status?: string | null
          can_appeal?: boolean
          change?: number
          created_at?: string
          group_id?: string | null
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_history_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deleted_emails: {
        Row: {
          deleted_at: string
          email: string
          id: string
          user_id: string
        }
        Insert: {
          deleted_at?: string
          email: string
          id?: string
          user_id: string
        }
        Update: {
          deleted_at?: string
          email?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          metadata: Json | null
          receiver_id: string
          sender_id: string
          type: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          metadata?: Json | null
          receiver_id: string
          sender_id: string
          type?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          metadata?: Json | null
          receiver_id?: string
          sender_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_otp_codes: {
        Row: {
          code_hash: string
          created_at: string
          email: string
          expires_at: string
          id: string
          type: string
          used_at: string | null
        }
        Insert: {
          code_hash: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          type: string
          used_at?: string | null
        }
        Update: {
          code_hash?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          type?: string
          used_at?: string | null
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          group_id: string | null
          id: string
          message: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          group_id?: string | null
          id?: string
          message?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          group_id?: string | null
          id?: string
          message?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_invitations: {
        Row: {
          created_at: string
          group_id: string
          id: string
          invitee_id: string
          inviter_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          invitee_id: string
          inviter_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          invitee_id?: string
          inviter_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_invitations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_invitations_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_member_exits: {
        Row: {
          created_at: string
          credit_change: number
          exit_type: string
          group_id: string
          id: string
          kicked_by: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          credit_change?: number
          exit_type: string
          group_id: string
          id?: string
          kicked_by?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          credit_change?: number
          exit_type?: string
          group_id?: string
          id?: string
          kicked_by?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_member_exits_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_member_exits_kicked_by_fkey"
            columns: ["kicked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_member_exits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          address: string
          city_id: string
          created_at: string
          end_time: string
          game_note: string | null
          host_id: string
          id: string
          is_visible: boolean
          latitude: number | null
          longitude: number | null
          needed_slots: number
          play_style: string | null
          start_time: string
          status: Database["public"]["Enums"]["group_status"]
          total_slots: number
          updated_at: string
        }
        Insert: {
          address: string
          city_id: string
          created_at?: string
          end_time: string
          game_note?: string | null
          host_id: string
          id?: string
          is_visible?: boolean
          latitude?: number | null
          longitude?: number | null
          needed_slots: number
          play_style?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["group_status"]
          total_slots: number
          updated_at?: string
        }
        Update: {
          address?: string
          city_id?: string
          created_at?: string
          end_time?: string
          game_note?: string | null
          host_id?: string
          id?: string
          is_visible?: boolean
          latitude?: number | null
          longitude?: number | null
          needed_slots?: number
          play_style?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["group_status"]
          total_slots?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_start_reminders: {
        Row: {
          created_at: string
          group_id: string
          id: string
          last_error: string | null
          notification_id: string | null
          recipient_role: string
          remind_at: string
          scheduled_start_time: string
          sent_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          last_error?: string | null
          notification_id?: string | null
          recipient_role: string
          remind_at: string
          scheduled_start_time: string
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          last_error?: string | null
          notification_id?: string | null
          recipient_role?: string
          remind_at?: string
          scheduled_start_time?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_start_reminders_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_start_reminders_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_start_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_rate_limits: {
        Row: {
          created_at: string
          date: string
          id: string
          ip_address: string
          logins: number
          registrations: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          ip_address: string
          logins?: number
          registrations?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          ip_address?: string
          logins?: number
          registrations?: number
          updated_at?: string
        }
        Relationships: []
      }
      join_requests: {
        Row: {
          created_at: string
          group_id: string
          host_id: string
          id: string
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          host_id: string
          id?: string
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          host_id?: string
          id?: string
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "join_requests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          group_id: string
          id: string
          sender_id: string
          type: Database["public"]["Enums"]["message_type"]
        }
        Insert: {
          content: string
          created_at?: string
          group_id: string
          id?: string
          sender_id: string
          type?: Database["public"]["Enums"]["message_type"]
        }
        Update: {
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          sender_id?: string
          type?: Database["public"]["Enums"]["message_type"]
        }
        Relationships: [
          {
            foreignKeyName: "messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blacklist: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_blacklist_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blacklist_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string
          created_at: string
          id: string
          link_to: string | null
          read: boolean
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          link_to?: string | null
          read?: boolean
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          link_to?: string | null
          read?: boolean
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      play_styles: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          can_create_group: boolean
          can_join_group: boolean
          city_id: string | null
          created_at: string
          credit_score: number
          daily_create_limit: number
          daily_join_limit: number
          id: string
          is_banned: boolean
          max_duration_hours: number
          max_start_hours: number
          nickname: string | null
          onboarding_completed: boolean
          phone: string | null
          require_email_verification: boolean
          real_name_last_submitted_at: string | null
          real_name_reject_reason_code: string | null
          real_name_reject_reason_text: string | null
          real_name_request_id: string | null
          real_name_review_required: boolean
          real_name_status: string
          real_name_verified_at: string | null
          deletion_status: string
          deletion_requested_at: string | null
          deletion_completed_at: string | null
          deleted_at: string | null
          uid: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          can_create_group?: boolean
          can_join_group?: boolean
          city_id?: string | null
          created_at?: string
          credit_score?: number
          daily_create_limit?: number
          daily_join_limit?: number
          id: string
          is_banned?: boolean
          max_duration_hours?: number
          max_start_hours?: number
          nickname?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          require_email_verification?: boolean
          real_name_last_submitted_at?: string | null
          real_name_reject_reason_code?: string | null
          real_name_reject_reason_text?: string | null
          real_name_request_id?: string | null
          real_name_review_required?: boolean
          real_name_status?: string
          real_name_verified_at?: string | null
          deletion_status?: string
          deletion_requested_at?: string | null
          deletion_completed_at?: string | null
          deleted_at?: string | null
          uid?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          can_create_group?: boolean
          can_join_group?: boolean
          city_id?: string | null
          created_at?: string
          credit_score?: number
          daily_create_limit?: number
          daily_join_limit?: number
          id?: string
          is_banned?: boolean
          max_duration_hours?: number
          max_start_hours?: number
          nickname?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          require_email_verification?: boolean
          real_name_last_submitted_at?: string | null
          real_name_reject_reason_code?: string | null
          real_name_reject_reason_text?: string | null
          real_name_request_id?: string | null
          real_name_review_required?: boolean
          real_name_status?: string
          real_name_verified_at?: string | null
          deletion_status?: string
          deletion_requested_at?: string | null
          deletion_completed_at?: string | null
          deleted_at?: string | null
          uid?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          detail: string | null
          group_id: string | null
          id: string
          reason: string
          reported_id: string
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          group_id?: string | null
          id?: string
          reason: string
          reported_id: string
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          group_id?: string | null
          id?: string
          reason?: string
          reported_id?: string
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      account_deletion_audit_logs: {
        Row: {
          action: string
          created_at: string
          detail: Json | null
          id: string
          operator_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          detail?: Json | null
          id?: string
          operator_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          detail?: Json | null
          id?: string
          operator_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_deletion_audit_logs_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_deletion_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      account_deletion_requests: {
        Row: {
          applied_at: string
          cooling_off_expire_at: string
          created_at: string
          deleted_at: string | null
          forbidden_reason: string | null
          id: string
          result_reason: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_at?: string
          cooling_off_expire_at: string
          created_at?: string
          deleted_at?: string | null
          forbidden_reason?: string | null
          id?: string
          result_reason?: string | null
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_at?: string
          cooling_off_expire_at?: string
          created_at?: string
          deleted_at?: string | null
          forbidden_reason?: string | null
          id?: string
          result_reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_deletion_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      real_name_verification_audit_logs: {
        Row: {
          action: string
          created_at: string
          from_status: string | null
          id: string
          metadata: Json
          operator_id: string | null
          operator_type: string
          reason_code: string | null
          reason_text: string | null
          request_id: string | null
          to_status: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          from_status?: string | null
          id?: string
          metadata?: Json
          operator_id?: string | null
          operator_type: string
          reason_code?: string | null
          reason_text?: string | null
          request_id?: string | null
          to_status?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          from_status?: string | null
          id?: string
          metadata?: Json
          operator_id?: string | null
          operator_type?: string
          reason_code?: string | null
          reason_text?: string | null
          request_id?: string | null
          to_status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "real_name_verification_audit_logs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "real_name_verification_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "real_name_verification_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      real_name_verification_requests: {
        Row: {
          cancelled_at: string | null
          contact_phone_snapshot: string | null
          created_at: string
          id: string
          id_number_hash: string
          id_number_masked: string
          material_payload: Json
          real_name_encrypted: string
          review_result_code: string | null
          review_result_message: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          risk_flags: Json
          status: string
          submit_source: string
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          contact_phone_snapshot?: string | null
          created_at?: string
          id?: string
          id_number_hash: string
          id_number_masked: string
          material_payload?: Json
          real_name_encrypted: string
          review_result_code?: string | null
          review_result_message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_flags?: Json
          status: string
          submit_source?: string
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          contact_phone_snapshot?: string | null
          created_at?: string
          id?: string
          id_number_hash?: string
          id_number_masked?: string
          material_payload?: Json
          real_name_encrypted?: string
          review_result_code?: string | null
          review_result_message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_flags?: Json
          status?: string
          submit_source?: string
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "real_name_verification_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          attitude: number
          comment: string | null
          created_at: string
          group_id: string
          id: string
          punctuality: number
          reviewer_id: string
          skill: number
          target_id: string
        }
        Insert: {
          attitude: number
          comment?: string | null
          created_at?: string
          group_id: string
          id?: string
          punctuality: number
          reviewer_id: string
          skill: number
          target_id: string
        }
        Update: {
          attitude?: number
          comment?: string | null
          created_at?: string
          group_id?: string
          id?: string
          punctuality?: number
          reviewer_id?: string
          skill?: number
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      user_daily_actions: {
        Row: {
          created_at: string
          date: string
          groups_created: number
          groups_joined: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          groups_created?: number
          groups_joined?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          groups_created?: number
          groups_joined?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_daily_actions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_join_request: {
        Args: { _group_id: string; _request_id: string; _user_id: string }
        Returns: undefined
      }
      check_banned_words: { Args: { input_text: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      resolve_report: {
        Args: { _decision: string; _report_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "user" | "admin" | "super_admin" | "test"
      group_status: "OPEN" | "FULL" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
      message_type: "TEXT" | "VOICE" | "LOCATION"
      notification_type:
        | "application_update"
        | "group_cancelled"
        | "group_start_reminder"
        | "credit_change"
        | "review_received"
        | "friend_request"
        | "group_invitation"
        | "direct_message"
        | "account_deletion"
        | "real_name_submitted"
        | "real_name_approved"
        | "real_name_rejected"
      request_status: "PENDING" | "APPROVED" | "REJECTED"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["user", "admin", "super_admin", "test"],
      group_status: ["OPEN", "FULL", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      message_type: ["TEXT", "VOICE", "LOCATION"],
      notification_type: [
        "application_update",
        "group_cancelled",
        "group_start_reminder",
        "credit_change",
        "review_received",
        "friend_request",
        "group_invitation",
        "direct_message",
        "account_deletion",
        "real_name_submitted",
        "real_name_approved",
        "real_name_rejected",
      ],
      request_status: ["PENDING", "APPROVED", "REJECTED"],
    },
  },
} as const
