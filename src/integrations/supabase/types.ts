export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      market_data: {
        Row: {
          created_at: string
          id: string
          price: number
          symbol: string
          timestamp: number
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          price: number
          symbol: string
          timestamp: number
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          price?: number
          symbol?: string
          timestamp?: number
          type?: string
        }
        Relationships: []
      }
      options_trades: {
        Row: {
          contracts: number
          created_at: string | null
          expiration_date: string
          id: string
          option_type: string
          premium_per_contract: number
          status: string | null
          strike_price: number
          symbol: string
          total_premium: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          contracts: number
          created_at?: string | null
          expiration_date: string
          id?: string
          option_type: string
          premium_per_contract: number
          status?: string | null
          strike_price: number
          symbol: string
          total_premium: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          contracts?: number
          created_at?: string | null
          expiration_date?: string
          id?: string
          option_type?: string
          premium_per_contract?: number
          status?: string | null
          strike_price?: number
          symbol?: string
          total_premium?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      portfolio: {
        Row: {
          average_price: number
          created_at: string
          id: string
          shares: number
          symbol: string
          updated_at: string
          user_id: string
        }
        Insert: {
          average_price: number
          created_at?: string
          id?: string
          shares?: number
          symbol: string
          updated_at?: string
          user_id: string
        }
        Update: {
          average_price?: number
          created_at?: string
          id?: string
          shares?: number
          symbol?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      recurring_investments: {
        Row: {
          amount: number
          created_at: string | null
          frequency: string
          id: string
          is_active: boolean | null
          next_execution_date: string
          symbol: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          frequency: string
          id?: string
          is_active?: boolean | null
          next_execution_date: string
          symbol: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          next_execution_date?: string
          symbol?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          created_at: string
          id: string
          is_fractional: boolean | null
          limit_price: number | null
          next_execution_date: string | null
          oco_link_id: string | null
          order_type: string | null
          price: number
          recurring_schedule: string | null
          risk_level: string | null
          shares: number
          status: string
          stop_price: number | null
          symbol: string
          total_amount: number
          trailing_percent: number | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_fractional?: boolean | null
          limit_price?: number | null
          next_execution_date?: string | null
          oco_link_id?: string | null
          order_type?: string | null
          price: number
          recurring_schedule?: string | null
          risk_level?: string | null
          shares: number
          status?: string
          stop_price?: number | null
          symbol: string
          total_amount: number
          trailing_percent?: number | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_fractional?: boolean | null
          limit_price?: number | null
          next_execution_date?: string | null
          oco_link_id?: string | null
          order_type?: string | null
          price?: number
          recurring_schedule?: string | null
          risk_level?: string | null
          shares?: number
          status?: string
          stop_price?: number | null
          symbol?: string
          total_amount?: number
          trailing_percent?: number | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
