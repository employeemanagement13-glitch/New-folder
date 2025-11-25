// components/charts/LineChart.tsx
'use client';

import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface LineChartProps {
  data: any[];
  dataKey: string;
  xAxisKey: string;
  strokeColor?: string;
  height?: number;
  tooltip?: React.ComponentProps<typeof Tooltip>;
}

export default function LineChart({
  data,
  dataKey,
  xAxisKey,
  strokeColor = '#FBBF24',
  height = 300,
  tooltip
}: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
        <CartesianGrid stroke="#333333" strokeDasharray="3 3" />
        <XAxis
          dataKey={xAxisKey}
          stroke="#9CA3AF"
          tickLine={false}
          axisLine={{ stroke: '#333333' }}
        />
        <YAxis
          stroke="#9CA3AF"
          tickLine={false}
          axisLine={{ stroke: '#333333' }}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: '#1a1a1a',
            border: '1px solid #333333',
            borderRadius: '8px',
            color: 'white'
          }}
          {...tooltip}
        />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={strokeColor}
          strokeWidth={3}
          dot={{ stroke: strokeColor, strokeWidth: 1, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}