export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          email: string
          full_name: string | null
          avatar_url: string | null
          timezone: string | null
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          timezone?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          timezone?: string | null
        }
      }
      trades: {
        Row: {
          id: string
          user_id: string
          created_at: string
          timestamp: string
          market_ticker: string
          market_id: string | null
          market_name: string | null
          direction: 'Yes' | 'No'
          price_cents: number
          amount_contracts: number
          fee_dollars: number
          order_type: 'Maker' | 'Taker' | null
          platform: 'kalshi' | 'polymarket' | 'other'
          tags: string[] | null
          notes: string | null
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          timestamp: string
          market_ticker: string
          market_id?: string | null
          market_name?: string | null
          direction: 'Yes' | 'No'
          price_cents: number
          amount_contracts: number
          fee_dollars?: number
          order_type?: 'Maker' | 'Taker' | null
          platform?: 'kalshi' | 'polymarket' | 'other'
          tags?: string[] | null
          notes?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          timestamp?: string
          market_ticker?: string
          market_id?: string | null
          market_name?: string | null
          direction?: 'Yes' | 'No'
          price_cents?: number
          amount_contracts?: number
          fee_dollars?: number
          order_type?: 'Maker' | 'Taker' | null
          platform?: 'kalshi' | 'polymarket' | 'other'
          tags?: string[] | null
          notes?: string | null
        }
      }
      positions: {
        Row: {
          id: string
          user_id: string
          created_at: string
          updated_at: string
          market_ticker: string
          market_id: string | null
          market_name: string | null
          direction: 'Yes' | 'No'
          entry_price: number
          size: number
          entry_time: number
          exit_price: number | null
          exit_time: number | null
          pnl: number | null
          fees: number
          status: 'open' | 'closed'
          order_id: string | null
          platform: 'kalshi' | 'polymarket' | 'other'
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          updated_at?: string
          market_ticker: string
          market_id?: string | null
          market_name?: string | null
          direction: 'Yes' | 'No'
          entry_price: number
          size: number
          entry_time: number
          exit_price?: number | null
          exit_time?: number | null
          pnl?: number | null
          fees?: number
          status?: 'open' | 'closed'
          order_id?: string | null
          platform?: 'kalshi' | 'polymarket' | 'other'
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          updated_at?: string
          market_ticker?: string
          market_id?: string | null
          market_name?: string | null
          direction?: 'Yes' | 'No'
          entry_price?: number
          size?: number
          entry_time?: number
          exit_price?: number | null
          exit_time?: number | null
          pnl?: number | null
          fees?: number
          status?: 'open' | 'closed'
          order_id?: string | null
          platform?: 'kalshi' | 'polymarket' | 'other'
        }
      }
      daily_stats: {
        Row: {
          id: string
          user_id: string
          date: string
          total_pnl: number
          realized_pnl: number
          unrealized_pnl: number
          total_volume: number
          trade_count: number
          equity: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          total_pnl?: number
          realized_pnl?: number
          unrealized_pnl?: number
          total_volume?: number
          trade_count?: number
          equity: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          total_pnl?: number
          realized_pnl?: number
          unrealized_pnl?: number
          total_volume?: number
          trade_count?: number
          equity?: number
          created_at?: string
          updated_at?: string
        }
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
  }
}

// Helper types for easier usage
export type Trade = Database['public']['Tables']['trades']['Row']
export type TradeInsert = Database['public']['Tables']['trades']['Insert']
export type TradeUpdate = Database['public']['Tables']['trades']['Update']

export type Position = Database['public']['Tables']['positions']['Row']
export type PositionInsert = Database['public']['Tables']['positions']['Insert']
export type PositionUpdate = Database['public']['Tables']['positions']['Update']

export type DailyStat = Database['public']['Tables']['daily_stats']['Row']
export type DailyStatInsert = Database['public']['Tables']['daily_stats']['Insert']
export type DailyStatUpdate = Database['public']['Tables']['daily_stats']['Update']

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
