// components/SectionHeader.tsx
'use client';

interface SectionHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export default function SectionHeader({
  title,
  description,
  actions,
  className = ""
}: SectionHeaderProps) {
  return (
    <div className={`flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 pb-2 border-b border-[#333333] ${className}`}>
      <div className="mb-4 lg:mb-0">
        <h2 className="text-[18px] font-bold text-white">{title}</h2>
        {description && (
          <p className="text-sm text-gray-400 mt-1">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {actions}
        </div>
      )}
    </div>
  );
}