'use server'

import { createClient } from '@/lib/supabase/server'
import { Database } from '@/lib/database.types'

type Trade = Database['public']['Tables']['trades']['Row']
type PositionInsert = Database['public']['Tables']['positions']['Insert']
type Settlement = Database['public']['Tables']['settlements']['Row']

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
  settled_by_id?: string
  settlement_result?: 'yes' | 'no'
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

  // Close all remaining layers with settlement result
  settlePosition(result: 'yes' | 'no', settlementDate: string, settlementId?: string): Realization[] {
    const settlementRealizations: Realization[] = []

    // Process all remaining layers
    while (this.layers.length > 0) {
      const layer = this.layers[0]

      // Determine exit price based on settlement result and position direction
      // If Yes won (result = 'yes'), Yes contracts pay $1.00, No contracts pay $0.00
      // If No won (result = 'no'), No contracts pay $1.00, Yes contracts pay $0.00
      let exitPrice: number
      if (result === 'yes') {
        exitPrice = layer.direction === 'Yes' ? 100 : 0 // 100 cents = $1.00
      } else {
        exitPrice = layer.direction === 'No' ? 100 : 0
      }

      // Calculate P&L
      let pnl: number
      if (layer.direction === 'Yes') {
        pnl = layer.qty * (exitPrice - layer.price) / 100
      } else {
        pnl = layer.qty * (layer.price - exitPrice) / 100
      }

      // Subtract entry fee (no exit fee for settlements)
      pnl -= layer.fee

      settlementRealizations.push({
        qty: layer.qty,
        entry_price: layer.price,
        exit_price: exitPrice,
        entry_direction: layer.direction,
        exit_direction: layer.direction, // Settlement doesn't have opposite direction
        pnl: pnl,
        fees: layer.fee,
        entry_timestamp: layer.timestamp,
        exit_timestamp: settlementDate,
        settled_by_id: settlementId,
        settlement_result: result,
      })

      // Remove layer
      this.layers.shift()
    }

    this.realizations.push(...settlementRealizations)
    return settlementRealizations
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

    // Track positions per market
    const positions: Record<string, Position> = {}

    // Process trades if they exist
    if (trades && trades.length > 0) {
      console.log(`Processing ${trades.length} trades for user`)

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
      } // Close for loop
    } else {
      console.log('No trades found, but will continue to process settlements')
    }

    // Fetch settlements for user to close open positions
    const { data: settlements, error: settlementsError } = await supabase
      .from('settlements')
      .select('*')
      .eq('user_id', userId)
      .order('settlement_date', { ascending: true })

    if (settlementsError) {
      console.error('Error fetching settlements:', settlementsError)
      // Continue without settlements - non-fatal
    }

    console.log(`Found ${settlements?.length || 0} settlements for user`)

    // Process settlements to close open positions
    const settledTickers = new Set<string>() // Track which tickers had matching positions
    let standaloneCount = 0

    if (settlements && settlements.length > 0) {
      console.log('Phase A: Closing existing positions for settlements')
      // Phase A: Close existing open positions
      for (const settlement of settlements) {
        const ticker = settlement.market_ticker
        const result = settlement.result as 'yes' | 'no'
        const settlementDate = settlement.settlement_date
        let hadPosition = false

        // For Kalshi (no action), check the single ticker position
        if (positions[ticker]) {
          positions[ticker].settlePosition(result, settlementDate, settlement.id)
          hadPosition = true
        }

        // For Polymarket, check both Yes and No direction positions
        const yesKey = `${ticker}-Yes`
        const noKey = `${ticker}-No`
        if (positions[yesKey]) {
          positions[yesKey].settlePosition(result, settlementDate, settlement.id)
          hadPosition = true
        }
        if (positions[noKey]) {
          positions[noKey].settlePosition(result, settlementDate, settlement.id)
          hadPosition = true
        }

        if (hadPosition) {
          settledTickers.add(ticker)
        }
      }

      // Phase B: Create closed positions from settlements with no matching trades
      const standaloneSettlements = settlements.filter(s => !settledTickers.has(s.market_ticker))

      console.log(`Phase B: Creating standalone positions`)
      console.log(`Standalone settlements to process: ${standaloneSettlements.length}`)

      for (const settlement of standaloneSettlements) {
        console.log(`Processing settlement: ${settlement.market_ticker}`, {
          yes_contracts: settlement.yes_contracts_owned,
          no_contracts: settlement.no_contracts_owned,
          result: settlement.result,
          profit: settlement.profit_dollars
        })
        const yesContracts = settlement.yes_contracts_owned || 0
        const noContracts = settlement.no_contracts_owned || 0
        const netYes = yesContracts - noContracts

        // Skip if no contracts owned
        if (yesContracts === 0 && noContracts === 0) {
          continue
        }

        const result = settlement.result as 'yes' | 'no'
        const settlementDate = settlement.settlement_date

        // Determine which side user held (net position)
        let direction: 'Yes' | 'No'
        let size: number
        let entryPrice: number
        let exitPrice: number
        let hedgedPositionPnL: number | undefined = undefined

        if (netYes > 0) {
          // User held net Yes position
          direction = 'Yes'
          size = netYes
          entryPrice = Math.round((settlement.yes_avg_price_cents || 0) * 100)
          exitPrice = result === 'yes' ? 100 : 0
        } else if (netYes < 0) {
          // User held net No position
          direction = 'No'
          size = Math.abs(netYes)
          entryPrice = Math.round((settlement.no_avg_price_cents || 0) * 100)
          exitPrice = result === 'no' ? 100 : 0
        } else {
          // Perfectly hedged - equal Yes and No contracts
          // Use Kalshi's profit_dollars for net P&L (accounts for both sides)
          const hedgedPnL = settlement.profit_dollars || 0

          console.log(`Hedged position detected: ${settlement.market_ticker} (${yesContracts} Yes, ${noContracts} No)`)

          if (hedgedPnL === 0 && yesContracts === 0) {
            console.log(`Skipping hedged position with no contracts and $0 P&L`)
            continue
          }

          // Pick a side for display purposes (doesn't affect P&L calculation)
          // Use Yes side by default
          direction = 'Yes'
          size = yesContracts
          entryPrice = Math.round((settlement.yes_avg_price_cents || 0) * 100)
          exitPrice = result === 'yes' ? 100 : 0

          // Store Kalshi's P&L to use instead of calculating
          hedgedPositionPnL = hedgedPnL
        }

        // Calculate P&L
        let pnl: number
        if (typeof hedgedPositionPnL !== 'undefined') {
          // Use Kalshi's profit_dollars for hedged positions
          pnl = hedgedPositionPnL
          console.log(`Using Kalshi's hedged P&L: $${pnl.toFixed(2)}`)
        } else {
          // Calculate from entry/exit prices for net positions
          pnl = size * (exitPrice - entryPrice) / 100
          console.log(`Calculated P&L for ${direction} ${size} contracts: $${pnl.toFixed(2)} (entry: ${entryPrice}¢, exit: ${exitPrice}¢)`)
        }

        // Entry time: approximate as settlement date (we don't have actual entry time)
        // This is acceptable since we're creating a closed position
        const entryTimestamp = settlementDate
        const exitTimestamp = settlementDate

        // Add to positions map as a realized position
        const settlementKey = `settlement-${settlement.market_ticker}`
        if (!positions[settlementKey]) {
          positions[settlementKey] = new Position()
        }

        // Create a realization directly
        positions[settlementKey].realizations.push({
          qty: size,
          entry_price: entryPrice,
          exit_price: exitPrice,
          entry_direction: direction,
          exit_direction: direction,
          pnl: pnl,
          fees: 0, // Fees already included in profit_dollars
          entry_timestamp: entryTimestamp,
          exit_timestamp: exitTimestamp,
          settled_by_id: settlement.id,
          settlement_result: result,
        })

        standaloneCount++
        console.log(`Created standalone position for ${settlement.market_ticker}: ${direction} ${size} contracts, P&L: $${pnl}`)
      }

      console.log(`Phase B complete: Created ${standaloneCount} standalone positions`)
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
          settled_by_id: r.settled_by_id || null,
          settlement_result: r.settlement_result || null,
        })
      }
    }

    console.log(`Total realizations collected: ${allRealizations.length}`)

    if (allRealizations.length === 0) {
      console.log('No closed positions to insert')
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

    console.log(`After deduplication: ${newPositions.length} new positions to insert`)

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

    console.log(`Successfully inserted ${inserted} positions into database`)

    const totalPnL = allRealizations.reduce((sum, p) => sum + (p.pnl || 0), 0)

    const message = standaloneCount > 0
      ? `Calculated ${inserted} new positions (${standaloneCount} from settlements) with total P&L of $${totalPnL.toFixed(2)}`
      : `Calculated ${inserted} new positions with total P&L of $${totalPnL.toFixed(2)}`

    console.log(message)

    return {
      success: true,
      count: inserted,
      duplicates: allRealizations.length - inserted,
      totalPnL: Math.round(totalPnL * 100) / 100,
      message,
    }
  } catch (error) {
    console.error('Error calculating positions:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
