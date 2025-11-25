// Components/charts/PieChart.tsx
'use client';

import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface PieChartProps {
  data: any[];
  dataKey: string;
  nameKey: string;
  colors: string[];
  height?: number;
}

export default function PieChart({ 
  data, 
  dataKey, 
  nameKey, 
  colors, 
  height = 200 
}: PieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey={dataKey}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value: number) => [value, 'Count']}
          contentStyle={{ 
            backgroundColor: '#111111', 
            border: '1px solid #333333',
            borderRadius: '8px',
            color: 'white'
          }}
        />
        <Legend />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}