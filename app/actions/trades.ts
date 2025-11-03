'use server'

import { createClient } from '@/lib/supabase/server'
import type { TradeInsert } from '@/lib/database.types'

interface KalshiCSVRow {
  type: string
  Market_Ticker: string
  Market_Id: string
  Original_Date: string
  Price_In_Cents: string
  Amount_In_Dollars: string
  Fee_In_Dollars: string
  Traded_Time: string
  Direction: 'Yes' | 'No'
  Order_Type: 'Maker' | 'Taker'
}

interface ImportResult {
  success: boolean
  count?: number
  error?: string
  duplicates?: number
}

export async function importTrades(csvRows: KalshiCSVRow[]): Promise<ImportResult> {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: 'Not authenticated. Please log in and try again.',
      }
    }

    // Transform CSV rows to database format
    const trades: TradeInsert[] = csvRows.map((row) => {
      // Remove commas from dollar amounts
      const amountDollars = parseFloat(row.Amount_In_Dollars.replace(/,/g, ''))
      const feeDollars = parseFloat(row.Fee_In_Dollars.replace(/,/g, ''))
      const priceCents = parseInt(row.Price_In_Cents)

      // Calculate number of contracts from dollar amount
      // Amount = contracts * (price/100)
      // So contracts = amount / (price/100) = amount * 100 / price
      const contracts = Math.round((amountDollars * 100) / priceCents)

      return {
        user_id: user.id,
        timestamp: row.Original_Date,
        market_ticker: row.Market_Ticker,
        market_id: row.Market_Id,
        market_name: null, // Kalshi CSV doesn't include market name
        direction: row.Direction,
        price_cents: priceCents,
        amount_contracts: contracts,
        fee_dollars: feeDollars,
        order_type: row.Order_Type,
        platform: 'kalshi',
        tags: [],
        notes: null,
      }
    })

    // Check for duplicates (same market_ticker, timestamp, price, amount)
    const { data: existingTrades } = await supabase
      .from('trades')
      .select('market_ticker, timestamp, price_cents, amount_contracts')
      .eq('user_id', user.id)

    const existingSet = new Set(
      existingTrades?.map(
        (t) => `${t.market_ticker}-${t.timestamp}-${t.price_cents}-${t.amount_contracts}`
      ) || []
    )

    // Filter out duplicates
    const newTrades = trades.filter((trade) => {
      const key = `${trade.market_ticker}-${trade.timestamp}-${trade.price_cents}-${trade.amount_contracts}`
      return !existingSet.has(key)
    })

    if (newTrades.length === 0) {
      return {
        success: true,
        count: 0,
        duplicates: trades.length,
      }
    }

    // Insert trades in batches
    const batchSize = 100
    let insertedCount = 0
    const errors: string[] = []

    for (let i = 0; i < newTrades.length; i += batchSize) {
      const batch = newTrades.slice(i, i + batchSize)

      const { error: insertError } = await supabase
        .from('trades')
        .insert(batch)

      if (insertError) {
        errors.push(`Batch ${i / batchSize + 1}: ${insertError.message}`)
      } else {
        insertedCount += batch.length
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: `Partial import failed. ${insertedCount} trades imported. Errors: ${errors.join('; ')}`,
        count: insertedCount,
      }
    }

    return {
      success: true,
      count: insertedCount,
      duplicates: trades.length - newTrades.length,
    }
  } catch (err: any) {
    console.error('Import error:', err)
    return {
      success: false,
      error: err.message || 'Unknown error occurred during import',
    }
  }
}

export async function deleteAllTrades(): Promise<ImportResult> {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: 'Not authenticated',
      }
    }

    const { error: deleteError } = await supabase
      .from('trades')
      .delete()
      .eq('user_id', user.id)

    if (deleteError) {
      return {
        success: false,
        error: deleteError.message,
      }
    }

    // Get count of remaining trades to verify
    const { count } = await supabase
      .from('trades')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    return {
      success: true,
      count: 0, // All deleted
    }
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
    }
  }
}
