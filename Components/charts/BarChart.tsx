// components/charts/BarChart.tsx
'use client';

import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface BarChartProps {
  data: any[];
  dataKey: string;
  xAxisKey: string;
  fillColor?: string;
  height?: number;
  tooltip?: React.ComponentProps<typeof Tooltip>;
}

export default function BarChart({
  data,
  dataKey,
  xAxisKey,
  fillColor = '#FBBF24',
  height = 300,
  tooltip
}: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
        <Bar
          dataKey={dataKey}
          fill={fillColor}
          radius={[4, 4, 0, 0]}
        />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}