import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const RecentTrades = () => {
  const trades = [
    {
      id: 1,
      date: "2025-03-15",
      market: "Presidential Election 2024",
      side: "Yes",
      entry: 0.65,
      exit: 0.72,
      size: 1000,
      pl: 107.69,
      roi: 10.77,
    },
    {
      id: 2,
      date: "2025-03-14",
      market: "Fed Rate Decision March",
      side: "No",
      entry: 0.42,
      exit: 0.38,
      size: 800,
      pl: -33.68,
      roi: -4.21,
    },
    {
      id: 3,
      date: "2025-03-13",
      market: "Super Bowl Winner",
      side: "Yes",
      entry: 0.55,
      exit: 0.68,
      size: 1200,
      pl: 283.64,
      roi: 19.70,
    },
    {
      id: 4,
      date: "2025-03-12",
      market: "Tech IPO Success",
      side: "Yes",
      entry: 0.48,
      exit: 0.52,
      size: 600,
      pl: 50.00,
      roi: 8.33,
    },
    {
      id: 5,
      date: "2025-03-11",
      market: "Climate Agreement",
      side: "No",
      entry: 0.35,
      exit: 0.29,
      size: 900,
      pl: -154.29,
      roi: -17.14,
    },
  ];

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50">
            <TableHead className="text-muted-foreground">Date</TableHead>
            <TableHead className="text-muted-foreground">Market</TableHead>
            <TableHead className="text-muted-foreground">Side</TableHead>
            <TableHead className="text-muted-foreground text-right">Entry</TableHead>
            <TableHead className="text-muted-foreground text-right">Exit</TableHead>
            <TableHead className="text-muted-foreground text-right">Size</TableHead>
            <TableHead className="text-muted-foreground text-right">P/L</TableHead>
            <TableHead className="text-muted-foreground text-right">ROI</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trades.map((trade) => (
            <TableRow key={trade.id} className="border-border/50 hover:bg-accent/5 transition-colors">
              <TableCell className="text-foreground font-medium">{trade.date}</TableCell>
              <TableCell className="text-foreground">{trade.market}</TableCell>
              <TableCell>
                <Badge variant={trade.side === "Yes" ? "default" : "secondary"} className="rounded-full">
                  {trade.side}
                </Badge>
              </TableCell>
              <TableCell className="text-right text-muted-foreground">{trade.entry.toFixed(2)}</TableCell>
              <TableCell className="text-right text-muted-foreground">{trade.exit.toFixed(2)}</TableCell>
              <TableCell className="text-right text-muted-foreground">${trade.size}</TableCell>
              <TableCell className={`text-right font-semibold ${trade.pl >= 0 ? 'text-success' : 'text-destructive'}`}>
                ${trade.pl >= 0 ? '+' : ''}{trade.pl.toFixed(2)}
              </TableCell>
              <TableCell className={`text-right font-semibold ${trade.roi >= 0 ? 'text-success' : 'text-destructive'}`}>
                {trade.roi >= 0 ? '+' : ''}{trade.roi.toFixed(2)}%
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};