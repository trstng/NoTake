'use client'

import { useState, useRef } from 'react'
import Papa from 'papaparse'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

// Kalshi CSV format
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

// Preview format for display
interface TradePreview {
  timestamp: string
  market_ticker: string
  direction: string
  price_cents: number
  amount: number
}

export function CSVImportDialog() {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [preview, setPreview] = useState<TradePreview[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseKalshiRow = (row: KalshiCSVRow): TradePreview | null => {
    try {
      // Remove commas from amount and fee
      const amount = parseFloat(row.Amount_In_Dollars.replace(/,/g, ''))
      const priceCents = parseInt(row.Price_In_Cents)

      return {
        timestamp: row.Original_Date,
        market_ticker: row.Market_Ticker,
        direction: row.Direction,
        price_cents: priceCents,
        amount: amount,
      }
    } catch (err) {
      return null
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setError(null)
    setSuccess(false)

    // Parse and preview first 5 rows
    Papa.parse(selectedFile, {
      header: true,
      preview: 6, // 6 to skip header and get 5 data rows
      complete: (results) => {
        const rows = results.data as KalshiCSVRow[]
        const previews = rows
          .map(parseKalshiRow)
          .filter((row): row is TradePreview => row !== null)
          .slice(0, 5)

        if (previews.length === 0) {
          setError('No valid trades found in CSV. Please check format.')
        } else {
          setPreview(previews)
        }
      },
      error: (err) => {
        setError(`Failed to parse CSV: ${err.message}`)
      },
    })
  }

  const handleImport = async () => {
    if (!file) return

    setImporting(true)
    setError(null)

    try {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const rows = results.data as KalshiCSVRow[]

          // Parse and validate all rows
          const validTrades = rows
            .map(parseKalshiRow)
            .filter((row): row is TradePreview => row !== null)

          if (validTrades.length === 0) {
            setError('No valid trades found in CSV')
            setImporting(false)
            return
          }

          // TODO: Call server action to import trades
          // const result = await importTrades(validTrades)
          console.log('Parsed trades:', validTrades)
          console.log(`Total: ${validTrades.length} valid trades`)

          // For now, simulate import
          await new Promise((resolve) => setTimeout(resolve, 2000))

          setSuccess(true)
          setImporting(false)

          setTimeout(() => {
            setOpen(false)
            setFile(null)
            setPreview([])
            setSuccess(false)
          }, 2000)
        },
        error: (err) => {
          setError(`Import failed: ${err.message}`)
          setImporting(false)
        },
      })
    } catch (err: any) {
      setError(err.message)
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Import Trades
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import Kalshi Trades</DialogTitle>
          <DialogDescription>
            Upload your Kalshi CSV export file. The parser will automatically
            detect and convert the format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          <Card className="border-dashed border-2 border-neon-primary/30">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-2">
                <FileText className="h-10 w-10 text-muted-foreground" />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                >
                  {file ? file.name : 'Choose CSV File'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum file size: 10MB
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          {preview.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h4 className="text-sm font-medium mb-2">
                  Preview (first 5 rows)
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-2">Time</th>
                        <th className="text-left p-2">Market</th>
                        <th className="text-left p-2">Direction</th>
                        <th className="text-right p-2">Price</th>
                        <th className="text-right p-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="p-2 font-mono text-[10px]">
                            {new Date(row.timestamp).toLocaleDateString()}
                          </td>
                          <td className="p-2 truncate max-w-[200px]">
                            {row.market_ticker}
                          </td>
                          <td className="p-2">
                            <span
                              className={
                                row.direction === 'Yes'
                                  ? 'text-neon-profit font-medium'
                                  : 'text-neon-loss font-medium'
                              }
                            >
                              {row.direction}
                            </span>
                          </td>
                          <td className="p-2 text-right font-mono">
                            {row.price_cents}¢
                          </td>
                          <td className="p-2 text-right font-mono">
                            ${row.amount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-neon-loss/10 border border-neon-loss/30 rounded-lg">
              <AlertCircle className="h-4 w-4 text-neon-loss flex-shrink-0" />
              <p className="text-sm text-neon-loss">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-neon-profit/10 border border-neon-profit/30 rounded-lg">
              <CheckCircle2 className="h-4 w-4 text-neon-profit" />
              <p className="text-sm text-neon-profit">
                Trades imported successfully!
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={importing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!file || importing || success}
            >
              {importing ? 'Importing...' : 'Import Trades'}
            </Button>
          </div>
        </div>

        {/* CSV Format Guide */}
        <div className="mt-4 p-4 bg-surface rounded-lg">
          <h4 className="text-sm font-medium mb-2">Kalshi CSV Format:</h4>
          <div className="text-xs text-muted-foreground space-y-2">
            <p>
              <strong className="text-foreground">Expected columns:</strong>
            </p>
            <ul className="list-disc list-inside pl-2 space-y-1">
              <li>Market_Ticker, Market_Id</li>
              <li>Original_Date (ISO8601 timestamp)</li>
              <li>Direction (Yes/No)</li>
              <li>Price_In_Cents (0-100)</li>
              <li>Amount_In_Dollars, Fee_In_Dollars</li>
              <li>Order_Type (Maker/Taker)</li>
            </ul>
            <p className="pt-2">
              <strong className="text-foreground">To get your CSV:</strong>
            </p>
            <ol className="list-decimal list-inside pl-2 space-y-1">
              <li>Log into Kalshi</li>
              <li>Go to Portfolio → Activity</li>
              <li>Click &quot;Export&quot; and download CSV</li>
              <li>Upload the file here</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
