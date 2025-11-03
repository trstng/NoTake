"""
Upsert fresh positions to Supabase after parsing CSV with correct timestamps.
"""
import pandas as pd
from datetime import datetime
from collections import deque
from supabase import create_client
import sys
sys.path.append('/Users/tgonz/Desktop/Kalshi/data/src')
from config.settings import settings


class Position:
    """Track position with FIFO for realizations."""
    def __init__(self):
        self.layers = deque()
        self.realizations = []

    def add_fill(self, qty, price, fee, timestamp, direction):
        """Add a fill to position."""
        self.layers.append({
            'qty': qty,
            'price': price,
            'fee': fee,
            'timestamp': timestamp,
            'direction': direction
        })

    def realize(self, qty, exit_price, exit_fee, exit_timestamp, exit_direction):
        """Realize P&L using FIFO and return realizations with timestamps."""
        qty_to_realize = qty
        realizations_this_trade = []

        while qty_to_realize > 0 and self.layers:
            layer = self.layers[0]
            realized_qty = min(layer['qty'], qty_to_realize)

            # Calculate P&L based on direction
            if layer['direction'] == 'Yes':  # Closing long position
                pnl = realized_qty * (exit_price - layer['price'])
            else:  # Closing short position
                pnl = realized_qty * (layer['price'] - exit_price)

            # Subtract fees for both entry and exit
            total_fees = layer['fee'] * (realized_qty / layer['qty']) + exit_fee * (realized_qty / qty)
            pnl -= total_fees

            realizations_this_trade.append({
                'qty': realized_qty,
                'entry_price': layer['price'],
                'exit_price': exit_price,
                'entry_direction': layer['direction'],
                'exit_direction': exit_direction,
                'pnl': pnl,
                'fees': total_fees,
                'entry_timestamp': layer['timestamp'],
                'exit_timestamp': exit_timestamp
            })

            # Update layer
            layer['qty'] -= realized_qty
            layer['fee'] -= total_fees
            if layer['qty'] <= 0.001:  # Account for floating point
                self.layers.popleft()

            qty_to_realize -= realized_qty

        self.realizations.extend(realizations_this_trade)
        return realizations_this_trade

    def net_position(self):
        """Calculate net position (positive = long, negative = short)."""
        net = 0
        for layer in self.layers:
            if layer['direction'] == 'Yes':
                net += layer['qty']
            else:
                net -= layer['qty']
        return net


def parse_trades(csv_path):
    """Parse CSV trades and apply FIFO logic."""

    print("=" * 80)
    print("PARSING TRADES FROM CSV")
    print("=" * 80)
    print()

    # Load CSV
    df = pd.read_csv(csv_path)

    # Parse timestamps properly using the Original_Date field (ISO format)
    df['timestamp'] = pd.to_datetime(df['Original_Date'], format='ISO8601', utc=True)

    # Sort oldest first (chronological order for FIFO)
    df = df.sort_values('timestamp').reset_index(drop=True)

    print(f"Total Trades: {len(df)}")
    print(f"Date Range: {df['timestamp'].min()} to {df['timestamp'].max()}")
    print()

    # Prepare data - convert to numeric types (remove commas first!)
    df['contracts'] = pd.to_numeric(df['Amount_In_Dollars'].astype(str).str.replace(',', ''), errors='coerce')
    df['price_dollars'] = pd.to_numeric(df['Price_In_Cents'], errors='coerce') / 100
    df['fees'] = pd.to_numeric(df['Fee_In_Dollars'], errors='coerce')

    # Track positions per market
    positions = {}

    for idx, trade in df.iterrows():
        ticker = trade['Market_Ticker']
        qty = trade['contracts']
        price = trade['price_dollars']
        fee = trade['fees']
        direction = trade['Direction']
        timestamp = trade['timestamp']

        if ticker not in positions:
            positions[ticker] = Position()

        pos = positions[ticker]
        net_before = pos.net_position()

        # Determine if this is opening or closing
        if direction == 'Yes':
            if net_before < 0:
                # Closing short position
                close_qty = min(qty, abs(net_before))
                if close_qty > 0:
                    pos.realize(close_qty, price, fee * (close_qty/qty), timestamp, direction)

                # Open new long if qty remaining
                open_qty = qty - close_qty
                if open_qty > 0:
                    pos.add_fill(open_qty, price, fee * (open_qty/qty), timestamp, direction)
            else:
                # Opening new long or adding to long
                pos.add_fill(qty, price, fee, timestamp, direction)

        else:  # direction == 'No'
            if net_before > 0:
                # Closing long position
                close_qty = min(qty, net_before)
                if close_qty > 0:
                    pos.realize(close_qty, price, fee * (close_qty/qty), timestamp, direction)

                # Open new short if qty remaining
                open_qty = qty - close_qty
                if open_qty > 0:
                    pos.add_fill(open_qty, price, fee * (open_qty/qty), timestamp, direction)
            else:
                # Opening new short or adding to short
                pos.add_fill(qty, price, fee, timestamp, direction)

    # Collect all realizations
    all_realizations = []
    for ticker, pos in positions.items():
        for r in pos.realizations:
            all_realizations.append({
                'market_ticker': ticker,
                'entry_price': int(r['entry_price'] * 100),  # Convert to cents
                'exit_price': int(r['exit_price'] * 100),    # Convert to cents
                'size': int(r['qty']),
                'pnl': round(r['pnl'], 2),
                'fees': round(r['fees'], 2),
                'entry_time': int(r['entry_timestamp'].timestamp() * 1000),  # Unix ms
                'exit_time': int(r['exit_timestamp'].timestamp() * 1000),    # Unix ms
                'status': 'closed'
            })

    print(f"Parsed {len(all_realizations)} realized positions")

    # Show total P&L for verification
    total_pnl = sum(r['pnl'] for r in all_realizations)
    print(f"Total P&L from these positions: ${total_pnl:+,.2f}")
    print()

    return all_realizations


def upsert_to_supabase(realizations):
    """Delete old positions and insert new ones."""

    supabase = create_client(settings.supabase_url, settings.supabase_key)

    print("=" * 80)
    print("UPSERTING TO SUPABASE")
    print("=" * 80)
    print()

    # 1. Get count of existing positions
    result = supabase.table('positions').select('id', count='exact').eq('status', 'closed').execute()
    existing_count = result.count

    print(f"Existing closed positions in database: {existing_count}")
    print()

    # 2. Build set of existing positions for duplicate detection
    print("Fetching existing positions for duplicate detection...")
    existing_positions_set = set()

    # Fetch all existing positions in batches
    page_size = 1000
    offset = 0
    while True:
        result = supabase.table('positions').select('market_ticker,entry_time,exit_time').eq('status', 'closed').range(offset, offset + page_size - 1).execute()
        if not result.data:
            break

        for pos in result.data:
            key = (pos['market_ticker'], pos['entry_time'], pos['exit_time'])
            existing_positions_set.add(key)

        if len(result.data) < page_size:
            break
        offset += page_size

    print(f"Loaded {len(existing_positions_set)} existing position keys")
    print()

    # 3. Insert new positions in batches (skipping duplicates)
    print(f"Processing {len(realizations)} positions from CSV...")

    batch_size = 100
    inserted = 0
    skipped = 0

    for i in range(0, len(realizations), batch_size):
        batch = realizations[i:i+batch_size]

        # Filter out duplicates from this batch
        batch_to_insert = []
        for record in batch:
            key = (record['market_ticker'], record['entry_time'], record['exit_time'])
            if key in existing_positions_set:
                skipped += 1
            else:
                batch_to_insert.append(record)
                existing_positions_set.add(key)  # Add to set to avoid duplicates within CSV

        if not batch_to_insert:
            continue  # Skip if all records in batch are duplicates

        try:
            result = supabase.table('positions').insert(batch_to_insert).execute()
            inserted += len(batch_to_insert)
            print(f"  Inserted {inserted}, Skipped {skipped} (Total processed: {inserted + skipped}/{len(realizations)})")
        except Exception as e:
            print(f"  ❌ Error inserting batch {i//batch_size + 1}: {e}")
            # Try inserting one by one to identify problematic records
            for record in batch_to_insert:
                try:
                    supabase.table('positions').insert(record).execute()
                    inserted += 1
                except Exception as e2:
                    print(f"    ❌ Failed to insert: {record['market_ticker']} - {e2}")
                    skipped += 1

    print()
    print(f"✅ Successfully inserted {inserted} new positions")
    print(f"⏭️  Skipped {skipped} duplicate positions")
    print()

    # 4. Verify
    result = supabase.table('positions').select('*').eq('status', 'closed').limit(5).execute()

    print("Sample inserted positions:")
    for p in result.data:
        entry_dt = datetime.fromtimestamp(p['entry_time'] / 1000)
        exit_dt = datetime.fromtimestamp(p['exit_time'] / 1000)
        print(f"  {p['market_ticker']}")
        print(f"    Entry: {entry_dt} | Exit: {exit_dt}")
        print(f"    {p['size']} contracts @ ${p['entry_price']/100:.2f}→${p['exit_price']/100:.2f}")
        print(f"    P&L: ${p['pnl']:.2f}")
        print()

    # 5. Summary stats
    result = supabase.table('positions').select('pnl').eq('status', 'closed').execute()
    total_pnl = sum(p['pnl'] for p in result.data)

    print("=" * 80)
    print("DATABASE SUMMARY")
    print("=" * 80)
    print(f"Total closed positions: {len(result.data)}")
    print(f"Total realized P&L: ${total_pnl:+,.2f}")
    print()


if __name__ == '__main__':
    csv_path = '/Users/tgonz/Desktop/Kalshi/data/Kalshi-Recent-Activity-Trade (12).csv'

    # Parse trades
    realizations = parse_trades(csv_path)

    # Confirm with user
    print("=" * 80)
    print("READY TO APPEND POSITIONS")
    print("=" * 80)
    print(f"This will:")
    print(f"  1. Check for duplicates in the database")
    print(f"  2. Append {len(realizations)} new positions (skipping any duplicates)")
    print(f"  3. Existing positions will NOT be deleted")
    print()

    response = input("Proceed? (yes/no): ")

    if response.lower() == 'yes':
        upsert_to_supabase(realizations)
        print("✅ Position append complete!")
    else:
        print("❌ Cancelled")
