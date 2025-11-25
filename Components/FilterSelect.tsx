// components/FilterSelect.tsx
'use client';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
}

export default function FilterSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  icon,
  className = ""
}: FilterSelectProps) {
  return (
    <div className={`relative flex items-center w-full ${className}`}>
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          {icon}
        </div>
      )}

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none w-full p-2 pl-9 pr-8 rounded-lg bg-black border border-[#333333] text-white text-sm focus:ring-2 cursor-pointer"
      >
        {placeholder && (
          <option value="" className="bg-gray-800 text-gray-400">
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="bg-gray-800 text-white"
          >
            {option.label}
          </option>
        ))}
      </select>

      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none w-4 h-4"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
      </svg>
    </div>
  );
}