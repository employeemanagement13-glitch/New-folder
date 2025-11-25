// Components/charts/DonutChart.tsx
'use client';

import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface DonutChartProps {
  data: any[];
  dataKey: string;
  nameKey: string;
  colors: string[];
  height?: number;
}

export default function DonutChart({ 
  data, 
  dataKey, 
  nameKey, 
  colors, 
  height = 200 
}: DonutChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          dataKey={dataKey}
          label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value: number, name: string, props: any) => {
            const item = data.find(d => d[nameKey] === props.payload[nameKey]);
            return [value, item ? `${item[nameKey]} Employees` : 'Count'];
          }}
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
