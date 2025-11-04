'use server'

import { createClient } from '@/lib/supabase/server'
import { Database } from '@/lib/database.types'

type Trade = Database['public']['Tables']['trades']['Row']
type PositionInsert = Database['public']['Tables']['positions']['Insert']

interface PositionLayer {
  qty: number
  price: number // in cents
  fee: number
  timestamp: string
  direction: 'Yes' | 'No'
}

interface Realization {
  qty: number
  entry_price: number
  exit_price: number
  entry_direction: 'Yes' | 'No'
  exit_direction: 'Yes' | 'No'
  pnl: number
  fees: number
  entry_timestamp: string
  exit_timestamp: string
}

class Position {
  layers: PositionLayer[] = []
  realizations: Realization[] = []

  addFill(qty: number, price: number, fee: number, timestamp: string, direction: 'Yes' | 'No') {
    this.layers.push({ qty, price, fee, timestamp, direction })
  }

  realize(qty: number, exitPrice: number, exitFee: number, exitTimestamp: string, exitDirection: 'Yes' | 'No'): Realization[] {
    let qtyToRealize = qty
    const realizationsThisTrade: Realization[] = []

    while (qtyToRealize > 0 && this.layers.length > 0) {
      const layer = this.layers[0]
      const realizedQty = Math.min(layer.qty, qtyToRealize)

      // Calculate P&L based on direction (prices in cents)
      let pnl: number
      if (layer.direction === 'Yes') {
        // Closing long position
        pnl = realizedQty * (exitPrice - layer.price) / 100 // Convert cents to dollars
      } else {
        // Closing short position
        pnl = realizedQty * (layer.price - exitPrice) / 100 // Convert cents to dollars
      }

      // Subtract fees for both entry and exit
      const totalFees = layer.fee * (realizedQty / layer.qty) + exitFee * (realizedQty / qty)
      pnl -= totalFees

      realizationsThisTrade.push({
        qty: realizedQty,
        entry_price: layer.price,
        exit_price: exitPrice,
        entry_direction: layer.direction,
        exit_direction: exitDirection,
        pnl: pnl,
        fees: totalFees,
        entry_timestamp: layer.timestamp,
        exit_timestamp: exitTimestamp,
      })

      // Update layer
      layer.qty -= realizedQty
      layer.fee -= totalFees

      // Remove layer if depleted (account for floating point)
      if (layer.qty <= 0.001) {
        this.layers.shift()
      }

      qtyToRealize -= realizedQty
    }

    this.realizations.push(...realizationsThisTrade)
    return realizationsThisTrade
  }

  netPosition(): number {
    // Positive = long, negative = short
    let net = 0
    for (const layer of this.layers) {
      if (layer.direction === 'Yes') {
        net += layer.qty
      } else {
        net -= layer.qty
      }
    }
    return net
  }
}

export async function calculatePositions(userId: string) {
  try {
    const supabase = await createClient()

    // Fetch all trades for user, sorted chronologically (oldest first for FIFO)
    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: true })

    if (tradesError) throw tradesError
    if (!trades || trades.length === 0) {
      return { success: true, count: 0, message: 'No trades to process' }
    }

    // Track positions per market
    const positions: Record<string, Position> = {}

    for (const trade of trades) {
      const ticker = trade.market_ticker
      const qty = trade.amount_contracts
      const price = trade.price_cents
      const fee = trade.fee_dollars
      const direction = trade.direction as 'Yes' | 'No'
      const timestamp = trade.timestamp
      const action = trade.action as 'Buy' | 'Sell' | null

      // For Polymarket, track Yes and No positions separately
      // For Kalshi, use single ticker to track net position
      const positionKey = action ? `${ticker}-${direction}` : ticker

      if (!positions[positionKey]) {
        positions[positionKey] = new Position()
      }

      const pos = positions[positionKey]

      // Handle Polymarket trades (have action field)
      if (action) {
        if (action === 'Buy') {
          // Buy = opening/adding to position in this direction
          pos.addFill(qty, price, fee, timestamp, direction)
        } else {
          // Sell = closing position in this direction
          if (pos.layers.length > 0) {
            pos.realize(qty, price, fee, timestamp, direction)
          }
          // If no layers to close, this could be a short sell - just add as a negative layer
          // For now, we'll ignore sells with no position (shouldn't happen in real data)
        }
      } else {
        // Handle Kalshi trades (no action field) - original logic
        const netBefore = pos.netPosition()

        // Determine if this is opening or closing
        if (direction === 'Yes') {
          if (netBefore < 0) {
            // Closing short position
            const closeQty = Math.min(qty, Math.abs(netBefore))
            if (closeQty > 0) {
              pos.realize(closeQty, price, fee * (closeQty / qty), timestamp, direction)
            }

            // Open new long if qty remaining
            const openQty = qty - closeQty
            if (openQty > 0) {
              pos.addFill(openQty, price, fee * (openQty / qty), timestamp, direction)
            }
          } else {
            // Opening new long or adding to long
            pos.addFill(qty, price, fee, timestamp, direction)
          }
        } else {
          // direction === 'No'
          if (netBefore > 0) {
            // Closing long position
            const closeQty = Math.min(qty, netBefore)
            if (closeQty > 0) {
              pos.realize(closeQty, price, fee * (closeQty / qty), timestamp, direction)
            }

            // Open new short if qty remaining
            const openQty = qty - closeQty
            if (openQty > 0) {
              pos.addFill(openQty, price, fee * (openQty / qty), timestamp, direction)
            }
          } else {
            // Opening new short or adding to short
            pos.addFill(qty, price, fee, timestamp, direction)
          }
        }
      }
    }

    // Collect all closed realizations
    const allRealizations: PositionInsert[] = []
    for (const [positionKey, pos] of Object.entries(positions)) {
      for (const r of pos.realizations) {
        // Extract ticker from position key (remove -Yes or -No suffix for Polymarket)
        const ticker = positionKey.includes('-Yes') || positionKey.includes('-No')
          ? positionKey.substring(0, positionKey.lastIndexOf('-'))
          : positionKey

        allRealizations.push({
          user_id: userId,
          market_ticker: ticker,
          direction: r.entry_direction, // Yes or No
          entry_price: r.entry_price, // Already in cents
          exit_price: r.exit_price, // Already in cents
          size: Math.round(r.qty),
          pnl: Math.round(r.pnl * 100) / 100, // Round to 2 decimals
          fees: Math.round(r.fees * 100) / 100,
          entry_time: new Date(r.entry_timestamp).getTime(), // Unix ms
          exit_time: new Date(r.exit_timestamp).getTime(), // Unix ms
          status: 'closed',
        })
      }
    }

    if (allRealizations.length === 0) {
      return { success: true, count: 0, message: 'No closed positions yet' }
    }

    // Check for existing positions to avoid duplicates
    const { data: existingPositions } = await supabase
      .from('positions')
      .select('market_ticker, entry_time, exit_time')
      .eq('user_id', userId)
      .eq('status', 'closed')

    const existingSet = new Set(
      existingPositions?.map(
        (p) => `${p.market_ticker}-${p.entry_time}-${p.exit_time}`
      ) || []
    )

    // Filter out duplicates
    const newPositions = allRealizations.filter((pos) => {
      const key = `${pos.market_ticker}-${pos.entry_time}-${pos.exit_time}`
      return !existingSet.has(key)
    })

    if (newPositions.length === 0) {
      return {
        success: true,
        count: 0,
        duplicates: allRealizations.length,
        message: 'All positions already exist',
      }
    }

    // Insert in batches of 100
    const batchSize = 100
    let inserted = 0

    for (let i = 0; i < newPositions.length; i += batchSize) {
      const batch = newPositions.slice(i, i + batchSize)
      const { error } = await supabase.from('positions').insert(batch)

      if (error) {
        console.error('Error inserting position batch:', error)
        throw error
      }

      inserted += batch.length
    }

    const totalPnL = allRealizations.reduce((sum, p) => sum + (p.pnl || 0), 0)

    return {
      success: true,
      count: inserted,
      duplicates: allRealizations.length - inserted,
      totalPnL: Math.round(totalPnL * 100) / 100,
      message: `Calculated ${inserted} new positions with total P&L of $${totalPnL.toFixed(2)}`,
    }
  } catch (error) {
    console.error('Error calculating positions:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
