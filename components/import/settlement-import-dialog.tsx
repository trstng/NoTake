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
import { importKalshiSettlements } from '@/app/actions/trades'
import { useRouter } from 'next/navigation'

// Kalshi Settlement CSV format
interface KalshiSettlementCSVRow {
  type: string
  Original_Date: string
  Market_Ticker: string
  Result: 'yes' | 'no'
  Profit_In_Dollars: string
  Yes_Contracts_Owned: string
  Yes_Contracts_Average_Price_In_Cents: string
  No_Contracts_Owned: string
  No_Contracts_Average_Price_In_Cents: string
}

// Preview format for display
interface SettlementPreview {
  settlement_date: string
  market_ticker: string
  result: string
  profit: number
  contracts: number
}

export function SettlementImportDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [preview, setPreview] = useState<SettlementPreview[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseSettlementRow = (row: KalshiSettlementCSVRow): SettlementPreview | null => {
    try {
      const profit = parseFloat(row.Profit_In_Dollars.replace(/,/g, ''))
      const yesContracts = parseInt(row.Yes_Contracts_Owned.replace(/,/g, '')) || 0
      const noContracts = parseInt(row.No_Contracts_Owned.replace(/,/g, '')) || 0

      return {
        settlement_date: row.Original_Date,
        market_ticker: row.Market_Ticker,
        result: row.Result,
        profit: profit,
        contracts: Math.abs(yesContracts - noContracts),
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
      preview: 6,
      complete: (results) => {
        const rows = results.data as KalshiSettlementCSVRow[]
        const previews = rows
          .map(parseSettlementRow)
          .filter((row): row is SettlementPreview => row !== null)
          .slice(0, 5)

        if (previews.length === 0) {
          setError('No valid settlements found in CSV. Please check format.')
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
          const rows = results.data as KalshiSettlementCSVRow[]
          const validRows = rows.filter(
            (row) => row.Market_Ticker && row.Original_Date && row.Result
          )

          if (validRows.length === 0) {
            setError('No valid settlements found in CSV')
            setImporting(false)
            return
          }

          const result = await importKalshiSettlements(validRows)

          if (!result.success) {
            setError(result.error || 'Import failed')
            setImporting(false)
            return
          }

          const message = result.message || `Successfully imported ${result.count} settlement${result.count !== 1 ? 's' : ''}`
          setSuccessMessage(message)
          setSuccess(true)
          setImporting(false)
          router.refresh()

          setTimeout(() => {
            setOpen(false)
            setFile(null)
            setPreview([])
            setSuccess(false)
            setSuccessMessage('')
          }, 3000)
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
          Import Settlements
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Kalshi Settlements</DialogTitle>
          <DialogDescription>
            Upload your settlement CSV export from Kalshi to close open positions. Supports both binary (yes/no) and multi-outcome (scalar) markets.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
                  {file ? file.name : 'Choose Kalshi Settlement CSV'}
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

          {/* Format Guide */}
          <div className="p-4 bg-surface rounded-lg">
            <h4 className="text-sm font-medium mb-2">Kalshi Settlement CSV Format:</h4>
            <div className="text-xs text-muted-foreground space-y-2">
              <p>
                <strong className="text-foreground">Expected columns:</strong>
              </p>
              <ul className="list-disc list-inside pl-2 space-y-1">
                <li>Market_Ticker</li>
                <li>Original_Date (ISO8601 timestamp)</li>
                <li>Result (yes/no/scalar - which side won or scalar for multi-outcome markets)</li>
                <li>Profit_In_Dollars (total P&L from settlement)</li>
                <li>Yes_Contracts_Owned, No_Contracts_Owned</li>
                <li>Yes_Contracts_Average_Price_In_Cents, No_Contracts_Average_Price_In_Cents</li>
              </ul>
              <p className="pt-2">
                <strong className="text-foreground">To get your CSV:</strong>
              </p>
              <ol className="list-decimal list-inside pl-2 space-y-1">
                <li>Log into Kalshi</li>
                <li>Go to Portfolio → Activity</li>
                <li>Filter by &ldquo;Settlements&rdquo; (not Trades)</li>
                <li>Click &ldquo;Export&rdquo; and download Settlement CSV</li>
                <li>Upload the file here</li>
              </ol>
              <p className="pt-2 text-blue-500">
                <strong>Note:</strong> This will automatically close any open positions for the settled markets and calculate final P&L.
              </p>
            </div>
          </div>

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
                        <th className="text-left p-2">Date</th>
                        <th className="text-left p-2">Market</th>
                        <th className="text-left p-2">Result</th>
                        <th className="text-right p-2">Contracts</th>
                        <th className="text-right p-2">Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="p-2 text-[10px]">
                            {new Date(row.settlement_date).toLocaleDateString()}
                          </td>
                          <td className="p-2 truncate max-w-[200px]">
                            {row.market_ticker}
                          </td>
                          <td className="p-2">
                            <span
                              className={
                                row.result === 'yes'
                                  ? 'text-success font-medium'
                                  : 'text-destructive font-medium'
                              }
                            >
                              {row.result.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-2 text-right font-mono">
                            {row.contracts}
                          </td>
                          <td className="p-2 text-right font-mono">
                            <span className={row.profit >= 0 ? 'text-success' : 'text-destructive'}>
                              ${row.profit.toFixed(2)}
                            </span>
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
          {success && (
            <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/30 rounded-lg">
              <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
              <p className="text-sm text-success">
                {successMessage || 'Settlements imported successfully!'}
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
              {importing ? 'Importing...' : 'Import Settlements'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
