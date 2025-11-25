"use client";
import React from "react";

interface FilterSelectProps {
  icon?: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  className?: string;
}

export const FilterSelect: React.FC<FilterSelectProps> = ({
  icon,
  value,
  onChange,
  options,
  placeholder,
  className = "",
}) => {
  return (
    <div className={`relative flex items-center ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none w-full sm:w-48 p-2 pl-9 pr-8 rounded-lg bg-black border border-[#333333] text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
      >
        <option value="" className="bg-gray-800 text-gray-400">
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt} className="bg-gray-800 text-white">
            {opt}
          </option>
        ))}
      </select>

      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          {icon}
        </div>
      )}

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
};
