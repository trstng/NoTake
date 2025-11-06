'use server'

import { createClient } from '@/lib/supabase/server'
import type { TradeInsert } from '@/lib/database.types'
import { calculatePositions } from './positions'
import { updateDailyStats } from './stats'

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

interface PolymarketCSVRow {
  marketName: string
  action: 'Buy' | 'Sell' | 'Deposit'
  usdcAmount: string
  tokenAmount: string
  tokenName: string // 'Yes', 'No', or 'USDC' for deposits
  timestamp: string // Unix timestamp in seconds
  hash: string
}

interface KalshiSettlementCSVRow {
  type: string // Should always be "Settlement"
  Original_Date: string
  Market_Ticker: string
  Result: 'yes' | 'no'
  Profit_In_Dollars: string
  Yes_Contracts_Owned: string
  Yes_Contracts_Average_Price_In_Cents: string
  No_Contracts_Owned: string
  No_Contracts_Average_Price_In_Cents: string
}

interface SettlementInsert {
  user_id: string
  settlement_date: string
  market_ticker: string
  result: 'yes' | 'no'
  profit_dollars: number
  yes_contracts_owned: number
  yes_avg_price_cents: number
  no_contracts_owned: number
  no_avg_price_cents: number
}

interface ImportResult {
  success: boolean
  count?: number
  error?: string
  duplicates?: number
  message?: string
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
      const feeDollars = parseFloat(row.Fee_In_Dollars.replace(/,/g, ''))
      const priceCents = parseInt(row.Price_In_Cents)

      // Amount_In_Dollars is mislabeled by Kalshi - it's actually the contract count
      const contracts = parseFloat(row.Amount_In_Dollars.replace(/,/g, ''))

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

    // Calculate positions after successful import
    const positionResult = await calculatePositions(user.id)

    // Update daily stats after positions are calculated (with $0 starting capital)
    const statsResult = await updateDailyStats(user.id, 0)

    let message = `Imported ${insertedCount} trade${insertedCount !== 1 ? 's' : ''}`
    if (trades.length - newTrades.length > 0) {
      message += ` (${trades.length - newTrades.length} duplicate${trades.length - newTrades.length !== 1 ? 's' : ''} skipped)`
    }
    if (positionResult.success && positionResult.count && positionResult.count > 0) {
      message += `. Calculated ${positionResult.count} position${positionResult.count !== 1 ? 's' : ''}`
      if (positionResult.totalPnL !== undefined) {
        message += ` with ${positionResult.totalPnL >= 0 ? '+' : ''}$${positionResult.totalPnL.toFixed(2)} P&L`
      }
    }
    if (statsResult.success && statsResult.count && statsResult.count > 0) {
      message += `. Updated ${statsResult.count} day${statsResult.count !== 1 ? 's' : ''} of stats`
    }

    return {
      success: true,
      count: insertedCount,
      duplicates: trades.length - newTrades.length,
      message,
    }
  } catch (err: any) {
    console.error('Import error:', err)
    return {
      success: false,
      error: err.message || 'Unknown error occurred during import',
    }
  }
}

export async function importPolymarketTrades(csvRows: PolymarketCSVRow[]): Promise<ImportResult> {
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

    // Filter out deposits and map to database format
    const validRows = csvRows.filter(row => row.action !== 'Deposit' && (row.tokenName === 'Yes' || row.tokenName === 'No'))

    const trades: TradeInsert[] = validRows.map((row) => {
      const usdcAmount = parseFloat(row.usdcAmount)
      const tokenAmount = parseFloat(row.tokenAmount)

      // Calculate price in cents: (usdcAmount / tokenAmount) * 100
      const priceCents = Math.round((usdcAmount / tokenAmount) * 100)

      // Round contracts to nearest integer
      const contracts = Math.round(tokenAmount)

      // Convert Unix timestamp (seconds) to ISO8601 string
      const timestamp = new Date(parseInt(row.timestamp) * 1000).toISOString()

      return {
        user_id: user.id,
        timestamp,
        market_ticker: row.marketName, // Use market name as ticker since Polymarket doesn't have tickers
        market_id: null, // Polymarket doesn't have traditional market UUIDs
        market_name: row.marketName,
        direction: row.tokenName as 'Yes' | 'No',
        price_cents: priceCents,
        amount_contracts: contracts,
        fee_dollars: 0, // Polymarket CSV doesn't separate fees
        order_type: null, // Polymarket CSV doesn't include order type
        platform: 'polymarket',
        tags: [],
        notes: null,
        transaction_hash: row.hash, // Store blockchain transaction hash
        action: row.action as 'Buy' | 'Sell', // Store Buy/Sell action
      }
    })

    if (trades.length === 0) {
      return {
        success: true,
        count: 0,
        message: 'No valid trades found in CSV (deposits and invalid rows filtered out)',
      }
    }

    // Check for duplicates using transaction hash (unique identifier for Polymarket)
    const { data: existingTrades } = await supabase
      .from('trades')
      .select('transaction_hash')
      .eq('user_id', user.id)
      .eq('platform', 'polymarket')
      .not('transaction_hash', 'is', null)

    const existingHashes = new Set(
      existingTrades?.map((t) => t.transaction_hash) || []
    )

    // Filter out duplicates based on transaction hash
    const newTrades = trades.filter((trade) => {
      return !existingHashes.has(trade.transaction_hash)
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

    // Calculate positions after successful import
    const positionResult = await calculatePositions(user.id)

    // Update daily stats after positions are calculated (with $0 starting capital)
    const statsResult = await updateDailyStats(user.id, 0)

    let message = `Imported ${insertedCount} Polymarket trade${insertedCount !== 1 ? 's' : ''}`
    if (trades.length - newTrades.length > 0) {
      message += ` (${trades.length - newTrades.length} duplicate${trades.length - newTrades.length !== 1 ? 's' : ''} skipped)`
    }
    if (positionResult.success && positionResult.count && positionResult.count > 0) {
      message += `. Calculated ${positionResult.count} position${positionResult.count !== 1 ? 's' : ''}`
      if (positionResult.totalPnL !== undefined) {
        message += ` with ${positionResult.totalPnL >= 0 ? '+' : ''}$${positionResult.totalPnL.toFixed(2)} P&L`
      }
    }
    if (statsResult.success && statsResult.count && statsResult.count > 0) {
      message += `. Updated ${statsResult.count} day${statsResult.count !== 1 ? 's' : ''} of stats`
    }

    return {
      success: true,
      count: insertedCount,
      duplicates: trades.length - newTrades.length,
      message,
    }
  } catch (err: any) {
    console.error('Polymarket import error:', err)
    return {
      success: false,
      error: err.message || 'Unknown error occurred during Polymarket import',
    }
  }
}

export async function importKalshiSettlements(csvRows: KalshiSettlementCSVRow[]): Promise<ImportResult> {
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
    const settlements: SettlementInsert[] = csvRows.map((row, index) => {
      // Parse numeric values, removing commas and converting to proper types
      const profitDollars = parseFloat(row.Profit_In_Dollars.replace(/,/g, ''))
      const yesContractsOwned = parseInt(row.Yes_Contracts_Owned.replace(/,/g, '')) || 0
      const yesAvgPriceCents = parseFloat(row.Yes_Contracts_Average_Price_In_Cents.replace(/,/g, ''))
      const noContractsOwned = parseInt(row.No_Contracts_Owned.replace(/,/g, '')) || 0
      const noAvgPriceCents = parseFloat(row.No_Contracts_Average_Price_In_Cents.replace(/,/g, ''))

      // Normalize result value - trim whitespace and convert to lowercase
      const resultRaw = row.Result?.toString().trim().toLowerCase()

      // Handle different result types
      let finalResult: 'yes' | 'no'

      if (resultRaw === 'yes' || resultRaw === 'no') {
        // Binary market - use result as-is
        finalResult = resultRaw
      } else if (resultRaw === 'scalar') {
        // Scalar/multi-outcome market - map to yes/no based on profit
        finalResult = profitDollars > 0 ? 'yes' : 'no'
        console.log(`Converted scalar market settlement (row ${index + 1}): ${row.Market_Ticker} → ${finalResult} (P&L: $${profitDollars.toFixed(2)})`)
      } else {
        console.error(`Invalid result value at row ${index}: "${row.Result}" (normalized: "${resultRaw}")`)
        throw new Error(`Invalid settlement result at row ${index + 1}: "${row.Result}". Expected "yes", "no", or "scalar".`)
      }

      return {
        user_id: user.id,
        settlement_date: row.Original_Date,
        market_ticker: row.Market_Ticker,
        result: finalResult,
        profit_dollars: profitDollars,
        yes_contracts_owned: yesContractsOwned,
        yes_avg_price_cents: yesAvgPriceCents,
        no_contracts_owned: noContractsOwned,
        no_avg_price_cents: noAvgPriceCents,
      }
    })

    // Check for duplicates (same market_ticker and settlement_date)
    const { data: existingSettlements } = await supabase
      .from('settlements')
      .select('market_ticker, settlement_date')
      .eq('user_id', user.id)

    // Normalize dates to ISO format for consistent comparison
    const existingSet = new Set(
      existingSettlements?.map(
        (s) => `${s.market_ticker}-${new Date(s.settlement_date).toISOString()}`
      ) || []
    )

    // Filter out duplicates using normalized date comparison
    const newSettlements = settlements.filter((settlement) => {
      const normalizedDate = new Date(settlement.settlement_date).toISOString()
      const key = `${settlement.market_ticker}-${normalizedDate}`
      return !existingSet.has(key)
    })

    const duplicateCount = settlements.length - newSettlements.length
    console.log(`Settlement deduplication: ${settlements.length} total, ${newSettlements.length} new, ${duplicateCount} duplicates`)

    if (newSettlements.length === 0) {
      return {
        success: true,
        count: 0,
        duplicates: settlements.length,
        message: 'No new settlements to import - all are duplicates',
      }
    }

    // Insert settlements in batches
    const batchSize = 100
    let insertedCount = 0
    const errors: string[] = []

    for (let i = 0; i < newSettlements.length; i += batchSize) {
      const batch = newSettlements.slice(i, i + batchSize)

      const { error: insertError } = await supabase
        .from('settlements')
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
        error: `Partial import failed. ${insertedCount} settlements imported. Errors: ${errors.join('; ')}`,
        count: insertedCount,
      }
    }

    // Calculate positions after settlement import to close positions
    const positionResult = await calculatePositions(user.id)

    // Update daily stats
    const statsResult = await updateDailyStats(user.id, 0)

    let message = `Imported ${insertedCount} settlement${insertedCount !== 1 ? 's' : ''}`
    if (settlements.length - newSettlements.length > 0) {
      message += ` (${settlements.length - newSettlements.length} duplicate${settlements.length - newSettlements.length !== 1 ? 's' : ''} skipped)`
    }
    if (positionResult.success && positionResult.count && positionResult.count > 0) {
      message += `. Calculated ${positionResult.count} position${positionResult.count !== 1 ? 's' : ''}`
      if (positionResult.totalPnL !== undefined) {
        message += ` with ${positionResult.totalPnL >= 0 ? '+' : ''}$${positionResult.totalPnL.toFixed(2)} total P&L`
      }
    }
    if (statsResult.success && statsResult.count && statsResult.count > 0) {
      message += `. Updated ${statsResult.count} day${statsResult.count !== 1 ? 's' : ''} of stats`
    }

    return {
      success: true,
      count: insertedCount,
      duplicates: settlements.length - newSettlements.length,
      message,
    }
  } catch (err: any) {
    console.error('Settlement import error:', err)
    return {
      success: false,
      error: err.message || 'Unknown error occurred during settlement import',
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
