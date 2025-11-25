'use client';

import { useState, useEffect } from 'react';

interface Employee {
  id: string;
  name: string;
  employee_id: string;
  roles?: {
    role_name: string;
  };
  departments?: {
    name: string;
  };
}

interface EmployeeHeaderProps {
  employee: Employee | null;
}

export default function EmployeeHeader({ employee }: EmployeeHeaderProps) {
  const [currentStatus, setCurrentStatus] = useState<'Present' | 'Absent' | 'Late'>('Present');
  const [currentTime, setCurrentTime] = useState('');

  // ✅ Add null check
  if (!employee) {
    return (
      <div className="bg-[#111111] rounded-lg p-6 border border-[#333333]">
        <div className="text-center text-gray-400">
          Employee data not found
        </div>
      </div>
    );
  }

  useEffect(() => {
    // Update current time
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }));
    }, 1000);

    // Fetch today's attendance status
    const fetchTodayStatus = async () => {
      const today = new Date().toISOString().split('T')[0];
      try {
        const response = await fetch(`/api/attendance/today?employeeId=${employee.id}&date=${today}`);
        const { data } = await response.json();
        
        if (data?.status) {
          setCurrentStatus(data.status);
        }
      } catch (error) {
        console.error('Error fetching today status:', error);
      }
    };

    fetchTodayStatus();
    return () => clearInterval(timer);
  }, [employee.id]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'present': return 'bg-green-500';
      case 'absent': return 'bg-red-500';
      case 'late': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-[#111111] rounded-lg p-6 border border-[#333333]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 bg-[#ff9d00] rounded-full flex items-center justify-center text-xl font-bold">
            {employee.name.split(' ').map(n => n[0]).join('')}
          </div>
          
          {/* Employee Info */}
          <div>
            <h1 className="text-2xl font-bold text-white">{employee.name}</h1>
            <p className="text-gray-400">{employee.roles?.role_name || 'No role assigned'}</p>
            <p className="text-sm text-gray-500">Employee ID: {employee.employee_id}</p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-gray-400">Current Time</p>
            <p className="text-lg font-mono">{currentTime}</p>
          </div>
          <div className={`px-4 py-2 rounded-full ${getStatusColor(currentStatus)} text-white font-semibold`}>
            {currentStatus}
          </div>
        </div>
      </div>
    </div>
  );
}