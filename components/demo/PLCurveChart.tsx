import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

export const PLCurveChart = () => {
  // Mock data - cumulative P/L over time
  const data = [
    { date: 'Jan 1', pl: 0 },
    { date: 'Jan 5', pl: 150 },
    { date: 'Jan 10', pl: 280 },
    { date: 'Jan 15', pl: 420 },
    { date: 'Jan 20', pl: 380 },
    { date: 'Jan 25', pl: 650 },
    { date: 'Jan 30', pl: 890 },
    { date: 'Feb 4', pl: 1050 },
    { date: 'Feb 9', pl: 1180 },
    { date: 'Feb 14', pl: 1420 },
    { date: 'Feb 19', pl: 1650 },
    { date: 'Feb 24', pl: 1820 },
    { date: 'Feb 29', pl: 2100 },
    { date: 'Mar 5', pl: 2350 },
    { date: 'Mar 10', pl: 2580 },
    { date: 'Mar 15', pl: 2847.50 },
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="plGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
        <XAxis 
          dataKey="date" 
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
        />
        <YAxis 
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          tickFormatter={(value) => `$${value}`}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            boxShadow: 'var(--shadow-soft)',
          }}
          formatter={(value: number) => [`$${value.toFixed(2)}`, 'P/L']}
        />
        <Area 
          type="monotone" 
          dataKey="pl" 
          stroke="hsl(var(--primary))" 
          strokeWidth={2}
          fill="url(#plGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
