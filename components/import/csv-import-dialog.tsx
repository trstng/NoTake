'use client'

import { useState, useRef, useEffect } from 'react'
import Papa from 'papaparse'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { importTrades, importPolymarketTrades } from '@/app/actions/trades'
import { processNextBatch, getJobStatus } from '@/app/actions/positions'
import { useRouter } from 'next/navigation'

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

// Polymarket CSV format
interface PolymarketCSVRow {
  marketName: string
  action: 'Buy' | 'Sell' | 'Deposit'
  usdcAmount: string
  tokenAmount: string
  tokenName: string
  timestamp: string
  hash: string
}

// Preview format for display
interface TradePreview {
  timestamp: string
  market_ticker: string
  direction: string
  price_cents: number
  amount: number
}

type Platform = 'kalshi' | 'polymarket'

export function CSVImportDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [platform, setPlatform] = useState<Platform>('kalshi')
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [preview, setPreview] = useState<TradePreview[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Progress tracking state
  const [jobId, setJobId] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')

  const parseKalshiRow = (row: KalshiCSVRow): TradePreview | null => {
    try {
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

  const parsePolymarketRow = (row: PolymarketCSVRow): TradePreview | null => {
    try {
      // Skip deposits
      if (row.action === 'Deposit' || (row.tokenName !== 'Yes' && row.tokenName !== 'No')) {
        return null
      }

      const usdcAmount = parseFloat(row.usdcAmount)
      const tokenAmount = parseFloat(row.tokenAmount)
      const priceCents = Math.round((usdcAmount / tokenAmount) * 100)
      const timestamp = new Date(parseInt(row.timestamp) * 1000).toISOString()

      return {
        timestamp,
        market_ticker: row.marketName,
        direction: row.tokenName,
        price_cents: priceCents,
        amount: usdcAmount,
      }
    } catch (err) {
      return null
    }
  }

  // Process batches when a job is created
  useEffect(() => {
    if (!jobId) return

    const processBatches = async () => {
      setProcessing(true)

      try {
        let isComplete = false

        while (!isComplete) {
          const result = await processNextBatch(jobId)

          if (!result.success) {
            setError(result.error || 'Position calculation failed')
            setProcessing(false)
            return
          }

          // Update progress
          if (result.total && result.processed !== undefined) {
            const percent = Math.round((result.processed / result.total) * 100)
            setProgress(percent)
            setProgressMessage(`Processing trades: ${result.processed} / ${result.total}`)
          }

          isComplete = result.completed

          // Small delay to avoid hammering the server
          if (!isComplete) {
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }

        // Processing complete
        setProcessing(false)
        setProgressMessage('Position calculation complete!')
        setSuccess(true)
        router.refresh()

        // Close dialog after a delay
        setTimeout(() => {
          setOpen(false)
          setFile(null)
          setPreview([])
          setSuccess(false)
          setSuccessMessage('')
          setJobId(null)
          setProgress(0)
          setProgressMessage('')
        }, 2000)

      } catch (err: any) {
        setError(err.message || 'An error occurred during processing')
        setProcessing(false)
      }
    }

    processBatches()
  }, [jobId, router])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setError(null)
    setSuccess(false)

    // Parse and preview first 5 rows based on platform
    Papa.parse(selectedFile, {
      header: true,
      preview: 6,
      complete: (results) => {
        if (platform === 'kalshi') {
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
        } else {
          const rows = results.data as PolymarketCSVRow[]
          const previews = rows
            .map(parsePolymarketRow)
            .filter((row): row is TradePreview => row !== null)
            .slice(0, 5)

          if (previews.length === 0) {
            setError('No valid trades found in CSV. Please check format.')
          } else {
            setPreview(previews)
          }
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
          if (platform === 'kalshi') {
            const rows = results.data as KalshiCSVRow[]
            const validRows = rows.filter(
              (row) => row.Market_Ticker && row.Original_Date && row.Direction
            )

            if (validRows.length === 0) {
              setError('No valid trades found in CSV')
              setImporting(false)
              return
            }

            const result = await importTrades(validRows)

            if (!result.success) {
              setError(result.error || 'Import failed')
              setImporting(false)
              return
            }

            const message = result.message || `Successfully imported ${result.count} trade${result.count !== 1 ? 's' : ''}`
            setSuccessMessage(message)
            setImporting(false)

            // Start batch processing if we have a jobId
            if (result.jobId) {
              setJobId(result.jobId)
            } else {
              // No job created, just show success
              setSuccess(true)
              router.refresh()
              setTimeout(() => {
                setOpen(false)
                setFile(null)
                setPreview([])
                setSuccess(false)
                setSuccessMessage('')
              }, 3000)
            }
          } else {
            // Polymarket import
            const rows = results.data as PolymarketCSVRow[]
            const validRows = rows.filter(
              (row) => row.marketName && row.timestamp && row.tokenName
            )

            if (validRows.length === 0) {
              setError('No valid trades found in CSV')
              setImporting(false)
              return
            }

            const result = await importPolymarketTrades(validRows)

            if (!result.success) {
              setError(result.error || 'Import failed')
              setImporting(false)
              return
            }

            const message = result.message || `Successfully imported ${result.count} trade${result.count !== 1 ? 's' : ''}`
            setSuccessMessage(message)
            setImporting(false)

            // Start batch processing if we have a jobId
            if (result.jobId) {
              setJobId(result.jobId)
            } else {
              // No job created, just show success
              setSuccess(true)
              router.refresh()
              setTimeout(() => {
                setOpen(false)
                setFile(null)
                setPreview([])
                setSuccess(false)
                setSuccessMessage('')
              }, 3000)
            }
          }
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

  // Reset state when platform changes
  const handlePlatformChange = (value: string) => {
    setPlatform(value as Platform)
    setFile(null)
    setPreview([])
    setError(null)
    setSuccess(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Import Trades
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Trades</DialogTitle>
          <DialogDescription>
            Upload your CSV export file from Kalshi or Polymarket
          </DialogDescription>
        </DialogHeader>

        <Tabs value={platform} onValueChange={handlePlatformChange}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="kalshi">Kalshi</TabsTrigger>
            <TabsTrigger value="polymarket">Polymarket</TabsTrigger>
          </TabsList>

          <TabsContent value="kalshi" className="space-y-4">
            {/* File Upload */}
            <Card className="border-dashed border-2 border-primary/30">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center gap-2">
                  <FileText className="h-10 w-10 text-muted-foreground" />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                  >
                    {file ? file.name : 'Choose Kalshi CSV File'}
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

            {/* Kalshi Format Guide */}
            <div className="p-4 bg-surface rounded-lg">
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
          </TabsContent>

          <TabsContent value="polymarket" className="space-y-4">
            {/* File Upload */}
            <Card className="border-dashed border-2 border-primary/30">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center gap-2">
                  <FileText className="h-10 w-10 text-muted-foreground" />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                  >
                    {file ? file.name : 'Choose Polymarket CSV File'}
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

            {/* Polymarket Format Guide */}
            <div className="p-4 bg-surface rounded-lg">
              <h4 className="text-sm font-medium mb-2">Polymarket CSV Format:</h4>
              <div className="text-xs text-muted-foreground space-y-2">
                <p>
                  <strong className="text-foreground">Expected columns:</strong>
                </p>
                <ul className="list-disc list-inside pl-2 space-y-1">
                  <li>marketName (full market question)</li>
                  <li>action (Buy/Sell - deposits filtered out)</li>
                  <li>usdcAmount (dollar amount)</li>
                  <li>tokenAmount (number of contracts)</li>
                  <li>tokenName (Yes/No)</li>
                  <li>timestamp (Unix timestamp)</li>
                  <li>hash (transaction hash)</li>
                </ul>
                <p className="pt-2">
                  <strong className="text-foreground">To get your CSV:</strong>
                </p>
                <ol className="list-decimal list-inside pl-2 space-y-1">
                  <li>Log into Polymarket</li>
                  <li>Go to Portfolio → Transaction History</li>
                  <li>Click export button to download CSV</li>
                  <li>Upload the file here</li>
                </ol>
                <p className="pt-2 text-yellow-500">
                  <strong>Note:</strong> Deposit transactions will be automatically filtered out
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

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
                        <td className="p-2 text-[10px]">
                          {new Date(row.timestamp).toLocaleDateString()}
                        </td>
                        <td className="p-2 truncate max-w-[200px]">
                          {row.market_ticker}
                        </td>
                        <td className="p-2">
                          <span
                            className={
                              row.direction === 'Yes'
                                ? 'text-success font-medium'
                                : 'text-destructive font-medium'
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
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && !processing && (
          <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/30 rounded-lg">
            <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
            <p className="text-sm text-success">
              {successMessage || 'Trades imported successfully!'}
            </p>
          </div>
        )}

        {/* Processing Progress */}
        {processing && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {progressMessage || 'Calculating positions...'}
                  </p>
                  <Progress value={progress} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {progress}% complete
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={importing || processing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || importing || processing || success}
          >
            {importing ? 'Importing...' : processing ? 'Processing...' : 'Import Trades'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
