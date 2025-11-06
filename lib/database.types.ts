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
      daily_stats: {
        Row: {
          created_at: string
          date: string
          equity: number
          id: string
          realized_pnl: number
          total_pnl: number
          total_volume: number
          trade_count: number
          unrealized_pnl: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          equity: number
          id?: string
          realized_pnl?: number
          total_pnl?: number
          total_volume?: number
          trade_count?: number
          unrealized_pnl?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          equity?: number
          id?: string
          realized_pnl?: number
          total_pnl?: number
          total_volume?: number
          trade_count?: number
          unrealized_pnl?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          created_at: string
          direction: string
          entry_price: number
          entry_time: number
          exit_price: number | null
          exit_time: number | null
          fees: number
          id: string
          market_id: string | null
          market_name: string | null
          market_ticker: string
          order_id: string | null
          platform: string
          pnl: number | null
          settled_by_id: string | null
          settlement_result: string | null
          size: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          direction: string
          entry_price: number
          entry_time: number
          exit_price?: number | null
          exit_time?: number | null
          fees?: number
          id?: string
          market_id?: string | null
          market_name?: string | null
          market_ticker: string
          order_id?: string | null
          platform?: string
          pnl?: number | null
          settled_by_id?: string | null
          settlement_result?: string | null
          size: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          direction?: string
          entry_price?: number
          entry_time?: number
          exit_price?: number | null
          exit_time?: number | null
          fees?: number
          id?: string
          market_id?: string | null
          market_name?: string | null
          market_ticker?: string
          order_id?: string | null
          platform?: string
          pnl?: number | null
          settled_by_id?: string | null
          settlement_result?: string | null
          size?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_settled_by_id_fkey"
            columns: ["settled_by_id"]
            isOneToOne: false
            referencedRelation: "settlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_user_id_fkey"
            columns: ["user_id"]
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
          email: string
          full_name: string | null
          id: string
          timezone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      settlements: {
        Row: {
          created_at: string | null
          id: string
          market_ticker: string
          no_avg_price_cents: number | null
          no_contracts_owned: number | null
          profit_dollars: number | null
          result: string | null
          settlement_date: string
          user_id: string
          yes_avg_price_cents: number | null
          yes_contracts_owned: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          market_ticker: string
          no_avg_price_cents?: number | null
          no_contracts_owned?: number | null
          profit_dollars?: number | null
          result?: string | null
          settlement_date: string
          user_id: string
          yes_avg_price_cents?: number | null
          yes_contracts_owned?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          market_ticker?: string
          no_avg_price_cents?: number | null
          no_contracts_owned?: number | null
          profit_dollars?: number | null
          result?: string | null
          settlement_date?: string
          user_id?: string
          yes_avg_price_cents?: number | null
          yes_contracts_owned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "settlements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          action: string | null
          amount_contracts: number
          created_at: string
          direction: string
          fee_dollars: number
          id: string
          market_id: string | null
          market_name: string | null
          market_ticker: string
          notes: string | null
          order_type: string | null
          platform: string
          price_cents: number
          tags: string[] | null
          timestamp: string
          transaction_hash: string | null
          user_id: string
        }
        Insert: {
          action?: string | null
          amount_contracts: number
          created_at?: string
          direction: string
          fee_dollars?: number
          id?: string
          market_id?: string | null
          market_name?: string | null
          market_ticker: string
          notes?: string | null
          order_type?: string | null
          platform?: string
          price_cents: number
          tags?: string[] | null
          timestamp: string
          transaction_hash?: string | null
          user_id: string
        }
        Update: {
          action?: string | null
          amount_contracts?: number
          created_at?: string
          direction?: string
          fee_dollars?: number
          id?: string
          market_id?: string | null
          market_name?: string | null
          market_ticker?: string
          notes?: string | null
          order_type?: string | null
          platform?: string
          price_cents?: number
          tags?: string[] | null
          timestamp?: string
          transaction_hash?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_user_id_fkey"
            columns: ["user_id"]
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
