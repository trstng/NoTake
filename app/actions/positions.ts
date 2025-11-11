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
        // Closing long NO position (NO is also a long, not a short)
        pnl = realizedQty * (exitPrice - layer.price) / 100 // Convert cents to dollars
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
        // NO is also a long position, not a short
        pnl = layer.qty * (exitPrice - layer.price) / 100
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

// Get positions grouped by market and direction
export async function getGroupedPositions(userId: string) {
  try {
    const supabase = await createClient()

    // Fetch all closed positions for user
    const { data: positions, error } = await supabase
      .from('positions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'closed')
      .order('exit_time', { ascending: false })

    if (error) throw error
    if (!positions || positions.length === 0) {
      return []
    }

    // Group by market_ticker + direction
    const groups = new Map<string, {
      market_ticker: string
      market_name: string | null
      direction: 'Yes' | 'No'
      position_count: number
      total_pnl: number
      total_size: number
      total_fees: number
      first_entry_time: number
      last_exit_time: number
      positions_data: typeof positions
    }>()

    for (const pos of positions) {
      const key = `${pos.market_ticker}-${pos.direction}`

      if (!groups.has(key)) {
        groups.set(key, {
          market_ticker: pos.market_ticker,
          market_name: null, // Will fetch from trades table
          direction: pos.direction as 'Yes' | 'No',
          position_count: 0,
          total_pnl: 0,
          total_size: 0,
          total_fees: 0,
          first_entry_time: pos.entry_time,
          last_exit_time: pos.exit_time,
          positions_data: [],
        })
      }

      const group = groups.get(key)!
      group.position_count++
      group.total_pnl += pos.pnl || 0
      group.total_size += pos.size
      group.total_fees += pos.fees || 0
      group.first_entry_time = Math.min(group.first_entry_time, pos.entry_time)
      group.last_exit_time = Math.max(group.last_exit_time, pos.exit_time)
      group.positions_data.push(pos)
    }

    // Calculate average prices and ROI for each group
    const result = Array.from(groups.values()).map(group => {
      const groupPositions = group.positions_data

      // Calculate weighted average entry/exit prices
      const totalEntryCost = groupPositions.reduce((sum, p) => sum + (p.entry_price * p.size), 0)
      const totalExitValue = groupPositions.reduce((sum, p) => sum + (p.exit_price * p.size), 0)
      const totalSize = groupPositions.reduce((sum, p) => sum + p.size, 0)

      const avg_entry_price = totalSize > 0 ? Math.round(totalEntryCost / totalSize) : 0
      const avg_exit_price = totalSize > 0 ? Math.round(totalExitValue / totalSize) : 0

      // Calculate ROI: (total P&L / total entry cost) * 100
      const totalEntryCostDollars = totalEntryCost / 100 // Convert cents to dollars
      const roi = totalEntryCostDollars > 0 ? (group.total_pnl / totalEntryCostDollars) * 100 : 0

      return {
        market_ticker: group.market_ticker,
        market_name: group.market_name,
        direction: group.direction,
        position_count: group.position_count,
        total_pnl: Math.round(group.total_pnl * 100) / 100,
        total_size: group.total_size,
        total_fees: Math.round(group.total_fees * 100) / 100,
        first_entry_time: group.first_entry_time,
        last_exit_time: group.last_exit_time,
        avg_entry_price,
        avg_exit_price,
        roi: Math.round(roi * 100) / 100,
      }
    })

    // Fetch market names from trades table
    const uniqueTickers = Array.from(new Set(result.map(r => r.market_ticker)))
    const { data: trades } = await supabase
      .from('trades')
      .select('market_ticker, market_name')
      .in('market_ticker', uniqueTickers)
      .limit(uniqueTickers.length)

    // Create a map of ticker -> market_name
    const marketNames = new Map<string, string>()
    if (trades) {
      for (const trade of trades) {
        if (!marketNames.has(trade.market_ticker)) {
          marketNames.set(trade.market_ticker, trade.market_name)
        }
      }
    }

    // Add market names to results
    result.forEach(r => {
      r.market_name = marketNames.get(r.market_ticker) || null
    })

    // Sort by last exit time descending (most recent first)
    return result.sort((a, b) => b.last_exit_time - a.last_exit_time)
  } catch (error) {
    console.error('Error getting grouped positions:', error)
    throw error
  }
}

// Get all positions for a specific market and direction
export async function getPositionsForMarket(
  userId: string,
  marketTicker: string,
  direction: 'Yes' | 'No'
) {
  try {
    const supabase = await createClient()

    const { data: positions, error } = await supabase
      .from('positions')
      .select('*')
      .eq('user_id', userId)
      .eq('market_ticker', marketTicker)
      .eq('direction', direction)
      .eq('status', 'closed')
      .order('entry_time', { ascending: true })

    if (error) throw error

    return positions || []
  } catch (error) {
    console.error('Error getting positions for market:', error)
    throw error
  }
}

export async function calculatePositions(userId: string, maxTrades?: number, offsetTrades: number = 0) {
  try {
    const supabase = await createClient()

    // Fetch trades for user, sorted chronologically (oldest first for FIFO)
    // offsetTrades allows us to skip already-processed trades in batch processing
    // maxTrades limits how many to fetch in this batch
    const limit = maxTrades || 100000

    // Use range() for efficient pagination instead of limit()
    // range(from, to) is inclusive on both ends, so we do (offset, offset + limit - 1)
    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: true })
      .range(offsetTrades, offsetTrades + limit - 1)

    if (tradesError) throw tradesError

    // Track positions per market
    const positions: Record<string, Position> = {}

    // If we're doing batch processing with an offset, we need to restore position state
    // by loading existing open positions from the database
    if (offsetTrades > 0) {
      console.log(`[BATCH] Loading existing open positions to restore state for offset ${offsetTrades}`)

      // Fetch all open positions (positions with remaining layers) from the database
      const { data: openPositionsData } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'open')
        .limit(100000)

      // Restore position state for each market
      if (openPositionsData && openPositionsData.length > 0) {
        console.log(`[BATCH] Found ${openPositionsData.length} open positions to restore`)

        for (const dbPos of openPositionsData) {
          const ticker = dbPos.market_ticker
          const direction = dbPos.direction as 'Yes' | 'No'

          // Reconstruct the correct position key for settlement matching
          // If layers exist, check if they're all the same direction (Polymarket) or mixed (Kalshi)
          let positionKey = ticker // Default to ticker (Kalshi style)

          if (dbPos.layers && Array.isArray(dbPos.layers) && dbPos.layers.length > 0) {
            // Check if all layers have the same direction
            const allSameDirection = dbPos.layers.every((l: any) => l.direction === dbPos.layers[0].direction)

            if (allSameDirection) {
              // This is a Polymarket-style position (direction-specific)
              // Use the stored direction to build the key
              positionKey = `${ticker}-${direction}`
            }
            // else: Mixed directions = Kalshi net position, use ticker as-is
          }

          if (!positions[positionKey]) {
            positions[positionKey] = new Position()
          }

          // Deserialize and restore the layers from JSONB
          if (dbPos.layers && Array.isArray(dbPos.layers)) {
            const pos = positions[positionKey]

            for (const layerData of dbPos.layers) {
              pos.layers.push({
                qty: layerData.qty,
                price: layerData.price,
                fee: layerData.fee,
                timestamp: layerData.timestamp,
                direction: layerData.direction as 'Yes' | 'No'
              })
            }

            console.log(`[BATCH] Restored ${positionKey} with ${pos.layers.length} layers (${pos.layers.reduce((sum, l) => sum + l.qty, 0)} total contracts)`)
          } else {
            console.warn(`[BATCH] Position ${positionKey} has no layer data`)
          }
        }

        const totalRestoredLayers = Object.values(positions).reduce((sum, pos) => sum + pos.layers.length, 0)
        console.log(`[BATCH] State restoration complete: ${totalRestoredLayers} total layers restored`)
      } else {
        console.log(`[BATCH] No open positions found to restore`)
      }
    }

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

      // Log each trade being processed
      const tradeDate = new Date(timestamp).toISOString().split('T')[0]
      console.log(`[TRADE] ${ticker} | ${tradeDate} | ${direction} | ${action || 'Kalshi'} | qty=${qty} | price=${price}¢`)

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
          console.log(`  [POLYMARKET] Buy - adding to position`)
          pos.addFill(qty, price, fee, timestamp, direction)
        } else {
          // Sell = closing position in this direction
          if (pos.layers.length > 0) {
            console.log(`  [POLYMARKET] Sell - closing position (${pos.layers.length} layers)`)
            const realizationsBefore = pos.realizations.length
            pos.realize(qty, price, fee, timestamp, direction)
            const realizationsCreated = pos.realizations.length - realizationsBefore
            console.log(`  [REALIZE] Created ${realizationsCreated} realization(s)`)
          } else {
            console.log(`  [POLYMARKET] Sell - no layers to close, skipping`)
          }
          // If no layers to close, this could be a short sell - just add as a negative layer
          // For now, we'll ignore sells with no position (shouldn't happen in real data)
        }
      } else {
        // Handle Kalshi trades (no action field) - original logic
        const netBefore = pos.netPosition()
        console.log(`  [KALSHI] netPosition before: ${netBefore}`)

        // Determine if this is opening or closing
        if (direction === 'Yes') {
          if (netBefore < 0) {
            // Closing NO position with YES trade - invert price for NO exit
            const closeQty = Math.min(qty, Math.abs(netBefore))
            const openQty = qty - closeQty
            console.log(`  [KALSHI] YES closing NO position | closeQty=${closeQty} openQty=${openQty}`)
            if (closeQty > 0) {
              const invertedPrice = 100 - price // YES 2¢ = NO 98¢
              const realizationsBefore = pos.realizations.length
              pos.realize(closeQty, invertedPrice, fee * (closeQty / qty), timestamp, direction)
              const realizationsCreated = pos.realizations.length - realizationsBefore
              console.log(`  [REALIZE] Created ${realizationsCreated} realization(s) | exit price=${invertedPrice}¢ (inverted)`)
            }

            // Open new long if qty remaining
            if (openQty > 0) {
              console.log(`  [KALSHI] Opening new YES position | qty=${openQty}`)
              pos.addFill(openQty, price, fee * (openQty / qty), timestamp, direction)
            }
          } else {
            // Opening new long or adding to long
            console.log(`  [KALSHI] YES opening/adding to position | netBefore=${netBefore}`)
            pos.addFill(qty, price, fee, timestamp, direction)
          }
        } else {
          // direction === 'No'
          if (netBefore > 0) {
            // Closing YES position - use raw price (don't invert)
            const closeQty = Math.min(qty, netBefore)
            const openQty = qty - closeQty
            console.log(`  [KALSHI] NO closing YES position | closeQty=${closeQty} openQty=${openQty}`)
            if (closeQty > 0) {
              const realizationsBefore = pos.realizations.length
              pos.realize(closeQty, price, fee * (closeQty / qty), timestamp, direction)
              const realizationsCreated = pos.realizations.length - realizationsBefore
              console.log(`  [REALIZE] Created ${realizationsCreated} realization(s) | exit price=${price}¢ (raw)`)
            }

            // If qty remaining, opening NO position - invert price
            if (openQty > 0) {
              const invertedPrice = 100 - price
              console.log(`  [KALSHI] Opening new NO position | qty=${openQty} | price=${invertedPrice}¢ (inverted from ${price}¢)`)
              pos.addFill(openQty, invertedPrice, fee * (openQty / qty), timestamp, direction)
            }
          } else {
            // Opening NO position or adding to NO - invert price
            const invertedPrice = 100 - price
            console.log(`  [KALSHI] NO opening/adding to position | netBefore=${netBefore} | price=${invertedPrice}¢ (inverted from ${price}¢)`)
            pos.addFill(qty, invertedPrice, fee, timestamp, direction)
          }
        }
      }
      } // Close for loop

      // Log summary after processing all trades
      let totalRealizations = 0
      let totalOpenLayers = 0
      for (const [positionKey, pos] of Object.entries(positions)) {
        totalRealizations += pos.realizations.length
        totalOpenLayers += pos.layers.length
        if (pos.layers.length > 0) {
          console.log(`[OPEN LAYERS] ${positionKey} has ${pos.layers.length} open layer(s)`)
        }
      }
      console.log(`[SUMMARY] After processing trades: ${totalRealizations} realizations created, ${totalOpenLayers} open layers remaining`)
    } else {
      console.log('No trades found, but will continue to process settlements')
    }

    // Fetch settlements for user to close open positions
    const { data: settlements, error: settlementsError } = await supabase
      .from('settlements')
      .select('*')
      .eq('user_id', userId)
      .order('settlement_date', { ascending: true })
      .limit(100000) // Ensure all settlements are fetched (default is only 1000!)

    if (settlementsError) {
      console.error('Error fetching settlements:', settlementsError)
      // Continue without settlements - non-fatal
    }

    console.log(`Found ${settlements?.length || 0} settlements for user`)

    // Process settlements to close open positions
    if (settlements && settlements.length > 0) {
      console.log('Closing open positions with settlements')
      // Settlements ONLY close existing positions, never create new ones
      for (const settlement of settlements) {
        const ticker = settlement.market_ticker
        const result = settlement.result as 'yes' | 'no'
        const settlementDate = settlement.settlement_date
        let hadPosition = false

        // Check if ANY position exists for this ticker (trades may have already closed everything)
        // This prevents creating standalone settlements when trades exist
        const yesKey = `${ticker}-Yes`
        const noKey = `${ticker}-No`

        if (positions[ticker] || positions[yesKey] || positions[noKey]) {
          // Position(s) exist from trades - mark as settled to prevent standalone creation
          hadPosition = true

          // Try to settle any remaining open layers
          if (positions[ticker]) {
            positions[ticker].settlePosition(result, settlementDate, settlement.id)
          }
          if (positions[yesKey]) {
            positions[yesKey].settlePosition(result, settlementDate, settlement.id)
          }
          if (positions[noKey]) {
            positions[noKey].settlePosition(result, settlementDate, settlement.id)
          }
        }
      }

      // Settlements only close existing positions, never create new ones
      console.log(`Settlement processing complete. Settlements are only used to close open positions from trades.`)

      // Log summary after settlements
      let totalRealizationsAfterSettlements = 0
      let totalOpenLayersAfterSettlements = 0
      for (const [positionKey, pos] of Object.entries(positions)) {
        totalRealizationsAfterSettlements += pos.realizations.length
        totalOpenLayersAfterSettlements += pos.layers.length
      }
      console.log(`[SUMMARY] After settlements: ${totalRealizationsAfterSettlements} total realizations, ${totalOpenLayersAfterSettlements} open layers remaining`)
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
      .limit(100000) // Ensure all existing positions are fetched for dedup check

    const existingSet = new Set(
      existingPositions?.map(
        (p) => `${p.market_ticker}-${p.entry_time}-${p.exit_time}`
      ) || []
    )

    // Filter out duplicates
    const newPositions = allRealizations.filter((pos) => {
      const key = `${pos.market_ticker}-${pos.entry_time}-${pos.exit_time}`
      const isDuplicate = existingSet.has(key)
      if (isDuplicate) {
        const posDate = new Date(pos.entry_time).toISOString().split('T')[0]
        console.log(`[DUPLICATE] Filtered out: ${pos.market_ticker} | ${posDate} | ${pos.direction}`)
      }
      return !isDuplicate
    })

    console.log(`[DEDUP] After deduplication: ${newPositions.length} new positions to insert (${allRealizations.length - newPositions.length} duplicates filtered)`)

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

    // Save open positions with their layers for batch processing state restoration
    // This allows the next batch to continue with correct FIFO state
    const openPositions: Array<{
      user_id: string
      market_ticker: string
      direction: string
      entry_price: number
      size: number
      entry_time: number
      status: string
      layers: any
    }> = []

    for (const [positionKey, pos] of Object.entries(positions)) {
      if (pos.layers.length > 0) {
        // Extract ticker from position key (remove -Yes or -No suffix for Polymarket)
        const ticker = positionKey.includes('-Yes') || positionKey.includes('-No')
          ? positionKey.substring(0, positionKey.lastIndexOf('-'))
          : positionKey

        // Determine direction from position key (for Polymarket) or first layer
        let direction = 'Yes' // default
        if (positionKey.endsWith('-Yes')) {
          direction = 'Yes'
        } else if (positionKey.endsWith('-No')) {
          direction = 'No'
        } else if (pos.layers.length > 0) {
          direction = pos.layers[0].direction
        }

        // Calculate weighted average entry price and total size
        let totalSize = 0
        let totalCost = 0
        for (const layer of pos.layers) {
          totalSize += layer.qty
          totalCost += layer.qty * layer.price
        }
        const avgEntryPrice = totalSize > 0 ? Math.round(totalCost / totalSize) : 0
        const oldestLayerTime = pos.layers[0]?.timestamp || Date.now()

        // Serialize layers to JSONB
        const layersJson = pos.layers.map(layer => ({
          qty: layer.qty,
          price: layer.price,
          fee: layer.fee,
          timestamp: layer.timestamp,
          direction: layer.direction
        }))

        openPositions.push({
          user_id: userId,
          market_ticker: ticker, // Store base ticker for settlement matching
          direction,
          entry_price: avgEntryPrice,
          size: Math.round(totalSize),
          entry_time: new Date(oldestLayerTime).getTime(),
          status: 'open',
          layers: layersJson
        })
      }
    }

    if (openPositions.length > 0) {
      console.log(`[OPEN POSITIONS] Persisting ${openPositions.length} open positions with layers for state restoration`)

      // Delete existing open positions for this user to avoid duplicates
      // We're replacing them with the updated state
      const { error: deleteError } = await supabase
        .from('positions')
        .delete()
        .eq('user_id', userId)
        .eq('status', 'open')

      if (deleteError) {
        console.error('Error deleting old open positions:', deleteError)
      }

      // Insert updated open positions
      const { error: insertError } = await supabase
        .from('positions')
        .insert(openPositions)

      if (insertError) {
        console.error('Error inserting open positions:', insertError)
        // Don't throw - this is for state restoration, shouldn't fail the main operation
      } else {
        console.log(`[OPEN POSITIONS] Successfully persisted ${openPositions.length} open positions`)
      }
    } else {
      console.log(`[OPEN POSITIONS] No open positions to persist`)
    }

    const totalPnL = allRealizations.reduce((sum, p) => sum + (p.pnl || 0), 0)

    // Count open positions for debugging
    const openPositionsCount = Object.values(positions).reduce(
      (sum, pos) => sum + (pos.layers.length > 0 ? 1 : 0),
      0
    )

    const message = `Calculated ${inserted} new positions with total P&L of $${totalPnL.toFixed(2)}. ${openPositionsCount} position${openPositionsCount !== 1 ? 's' : ''} remain open.`

    console.log(message)

    return {
      success: true,
      count: inserted,
      duplicates: allRealizations.length - inserted,
      totalPnL: Math.round(totalPnL * 100) / 100,
      openPositionsCount,
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

// Job Management Functions for Batch Processing

type CalculationJob = {
  id: string
  user_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  total_trades: number
  processed_trades: number
  batch_size: number
  error_message: string | null
  created_at: string
  updated_at: string
}

export async function createCalculationJob(
  userId: string,
  totalTrades: number,
  batchSize: number = 500
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('position_calculation_jobs')
      .insert({
        user_id: userId,
        status: 'pending',
        total_trades: totalTrades,
        processed_trades: 0,
        batch_size: batchSize,
      })
      .select('id')
      .single()

    if (error) throw error

    return { success: true, jobId: data.id }
  } catch (error) {
    console.error('Error creating calculation job:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function getJobStatus(jobId: string): Promise<{
  success: boolean
  job?: CalculationJob
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('position_calculation_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error) throw error

    return { success: true, job: data as CalculationJob }
  } catch (error) {
    console.error('Error getting job status:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function updateJobProgress(
  jobId: string,
  processedTrades: number,
  status: 'pending' | 'processing' | 'completed' | 'failed' = 'processing'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('position_calculation_jobs')
      .update({
        processed_trades: processedTrades,
        status: status,
      })
      .eq('id', jobId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error updating job progress:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function completeJob(
  jobId: string,
  success: boolean,
  errorMessage?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('position_calculation_jobs')
      .update({
        status: success ? 'completed' : 'failed',
        error_message: errorMessage || null,
      })
      .eq('id', jobId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error completing job:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Process the next batch of trades for a calculation job
 * This function processes trades incrementally to avoid timeout issues
 * Note: Server actions have a 60s timeout by default. Each batch should complete within that.
 */
export async function processNextBatch(jobId: string): Promise<{
  success: boolean
  completed: boolean
  processed?: number
  total?: number
  error?: string
}> {
  try {
    // Get job status
    const jobResult = await getJobStatus(jobId)
    if (!jobResult.success || !jobResult.job) {
      return { success: false, completed: false, error: 'Job not found' }
    }

    const job = jobResult.job

    // Check if already completed
    if (job.status === 'completed') {
      return {
        success: true,
        completed: true,
        processed: job.total_trades,
        total: job.total_trades,
      }
    }

    // Check if failed
    if (job.status === 'failed') {
      return {
        success: false,
        completed: true,
        error: job.error_message || 'Job failed',
      }
    }

    // Calculate offset and batch size
    const offset = job.processed_trades
    const batchSize = Math.min(job.batch_size, job.total_trades - offset)
    const nextProcessedCount = offset + batchSize

    console.log(`Processing batch for job ${jobId}: trades ${offset}-${nextProcessedCount - 1} of ${job.total_trades}`)

    // Update status to processing
    await updateJobProgress(jobId, job.processed_trades, 'processing')

    // Process this batch using range-based pagination (offset, limit)
    // This processes ONLY the new trades, not reprocessing from the beginning
    const result = await calculatePositions(job.user_id, batchSize, offset)

    if (!result.success) {
      await completeJob(jobId, false, result.error)
      return {
        success: false,
        completed: true,
        error: result.error,
      }
    }

    // Update progress
    const isComplete = nextProcessedCount >= job.total_trades
    const newStatus = isComplete ? 'completed' : 'processing'

    await updateJobProgress(jobId, nextProcessedCount, newStatus)

    if (isComplete) {
      console.log(`Job ${jobId} completed: processed ${nextProcessedCount} trades`)
    }

    return {
      success: true,
      completed: isComplete,
      processed: nextProcessedCount,
      total: job.total_trades,
    }
  } catch (error) {
    console.error('Error processing batch:', error)

    // Try to mark job as failed
    try {
      await completeJob(jobId, false, error instanceof Error ? error.message : 'Unknown error')
    } catch (updateError) {
      console.error('Error updating job status:', updateError)
    }

    return {
      success: false,
      completed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
