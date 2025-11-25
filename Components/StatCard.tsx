// components/StatCard.tsx
'use client';

interface StatCardProps {
  title: string;
  value?: number | string;
  icon?: string;
  unit?: string;
  trend?: number;
  className?: string;
}

export default function StatCard({ 
  title, 
  value, 
  unit = '', 
  trend,
  className = "" 
}: StatCardProps) {
  const trendColor = trend && trend > 0 ? 'text-green-400' : trend && trend < 0 ? 'text-red-400' : 'text-gray-400';
  const trendIcon = trend && trend > 0 ? '↗' : trend && trend < 0 ? '↘' : '→';

  return (
    <div className={`bg-[#111111] p-6 rounded-xl shadow-2xl flex flex-col justify-between h-full border border-[#333333] ${className}`}>
      <div>
        <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
        <div className="text-3xl font-bold text-white">
          {value}
          {unit && <span className="text-xl font-normal text-gray-300 ml-1">{unit}</span>}
        </div>
      </div>
      {trend !== undefined && (
        <div className={`text-sm mt-2 ${trendColor}`}>
          <span className="mr-1">{trendIcon}</span>
          {Math.abs(trend)}% from last month
        </div>
      )}
    </div>
  );
}