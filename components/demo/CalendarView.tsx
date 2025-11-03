import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";

export const CalendarView = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());

  // Mock data for days with trades
  const tradingDays = [
    { date: new Date(2025, 2, 1), pl: 120 },
    { date: new Date(2025, 2, 3), pl: -45 },
    { date: new Date(2025, 2, 5), pl: 230 },
    { date: new Date(2025, 2, 7), pl: 85 },
    { date: new Date(2025, 2, 10), pl: -30 },
    { date: new Date(2025, 2, 12), pl: 150 },
    { date: new Date(2025, 2, 15), pl: 95 },
  ];

  return (
    <div className="space-y-4">
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        className="rounded-lg border-0 pointer-events-auto"
        modifiers={{
          profitable: tradingDays
            .filter(d => d.pl > 0)
            .map(d => d.date),
          loss: tradingDays
            .filter(d => d.pl < 0)
            .map(d => d.date),
        }}
        modifiersClassNames={{
          profitable: "bg-success/10 text-success font-semibold hover:bg-success/20",
          loss: "bg-destructive/10 text-destructive font-semibold hover:bg-destructive/20",
        }}
      />
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success/20 border-2 border-success" />
            <span className="text-muted-foreground">Profitable days</span>
          </div>
          <span className="font-medium text-foreground">
            {tradingDays.filter(d => d.pl > 0).length}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive/20 border-2 border-destructive" />
            <span className="text-muted-foreground">Loss days</span>
          </div>
          <span className="font-medium text-foreground">
            {tradingDays.filter(d => d.pl < 0).length}
          </span>
        </div>
      </div>
    </div>
  );
};