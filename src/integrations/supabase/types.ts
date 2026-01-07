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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      goals: {
        Row: {
          created_at: string | null
          current: number | null
          deadline: string | null
          id: string
          name: string
          target: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          current?: number | null
          deadline?: string | null
          id?: string
          name: string
          target: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          current?: number | null
          deadline?: string | null
          id?: string
          name?: string
          target?: number
          user_id?: string | null
        }
        Relationships: []
      }
      limits: {
        Row: {
          amount: number
          category_id: string
          created_at: string | null
          id: string
          period: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string | null
          id?: string
          period?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string | null
          id?: string
          period?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          biometric_enabled: boolean | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          language: string | null
          pin_hash: string | null
          telegram_id: number | null
          telegram_username: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          biometric_enabled?: boolean | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          language?: string | null
          pin_hash?: string | null
          telegram_id?: number | null
          telegram_username?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          biometric_enabled?: boolean | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          language?: string | null
          pin_hash?: string | null
          telegram_id?: number | null
          telegram_username?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      telegram_transactions: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          currency: string
          description: string | null
          id: string
          source: string
          synced: boolean
          telegram_user_id: number
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          source?: string
          synced?: boolean
          telegram_user_id: number
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          source?: string
          synced?: boolean
          telegram_user_id?: number
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      telegram_users: {
        Row: {
          code_expires_at: string | null
          created_at: string | null
          first_name: string | null
          id: number
          last_active: string | null
          linking_code: string | null
          telegram_id: number
          telegram_username: string | null
          user_id: string | null
        }
        Insert: {
          code_expires_at?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: number
          last_active?: string | null
          linking_code?: string | null
          telegram_id: number
          telegram_username?: string | null
          user_id?: string | null
        }
        Update: {
          code_expires_at?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: number
          last_active?: string | null
          linking_code?: string | null
          telegram_id?: number
          telegram_username?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category_id: string
          created_at: string | null
          date: string
          description: string | null
          id: string
          source: string | null
          telegram_id: number | null
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          source?: string | null
          telegram_id?: number | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          source?: string | null
          telegram_id?: number | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      link_telegram_account: {
        Args: {
          p_telegram_id: number
          p_telegram_username?: string
          p_user_id: string
        }
        Returns: boolean
      }
      sync_telegram_transactions: {
        Args: { p_user_id: string }
        Returns: {
          synced_count: number
        }[]
      }
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
