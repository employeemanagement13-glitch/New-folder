// app/Components/DatePicker.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function DatePicker({ value, onChange, placeholder = "Select date" }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(value || '');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDateSelect = (date: Date) => {
    const dateString = date.toLocaleDateString('en-GB');
    setSelectedDate(dateString);
    onChange(dateString);
    setIsOpen(false);
  };

  const clearDate = () => {
    setSelectedDate('');
    onChange('');
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    return { daysInMonth, startingDay };
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const { daysInMonth, startingDay } = getDaysInMonth(currentMonth);
  const today = new Date();

  const days = [];
  // Empty cells for starting day
  for (let i = 0; i < startingDay; i++) {
    days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const isToday = date.toDateString() === today.toDateString();
    const isSelected = selectedDate === date.toLocaleDateString('en-GB');
    
    days.push(
      <button
        key={day}
        onClick={() => handleDateSelect(date)}
        className={`w-8 h-8 rounded-full text-sm transition-colors ${
          isSelected
            ? 'bg-[#ff9d00] text-white'
            : isToday
            ? 'bg-gray-600 text-white'
            : 'hover:bg-gray-600 text-white'
        }`}
      >
        {day}
      </button>
    );
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Input
          placeholder={placeholder}
          value={selectedDate}
          readOnly
          onClick={() => setIsOpen(!isOpen)}
          className="pl-10 pr-10 bg-black border border-[#333333] rounded-lg text-white placeholder-gray-400 cursor-pointer"
        />
        <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        {selectedDate && (
          <button
            onClick={clearDate}
            className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-[#1a1a1a] border border-[#333333] rounded-lg shadow-lg z-50 w-64 p-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('prev')}
              className="text-white hover:bg-gray-600"
            >
              ‹
            </Button>
            <span className="text-white font-medium">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('next')}
              className="text-white hover:bg-gray-600"
            >
              ›
            </Button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="text-center text-xs text-gray-400 font-medium">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {days}
          </div>

          {/* Today button */}
          <div className="mt-3 pt-3 border-t border-[#333333]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDateSelect(today)}
              className="w-full text-white border-[#333333] hover:bg-gray-600"
            >
              Today
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}