'use client';

import { useState, useEffect } from 'react';

interface Employee {
  id: string;
  name: string;
  employee_id: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  employment_type?: string | null;
  roles?: {
    role_name: string;
  };
  departments?: {
    name: string;
  } | null;
}

interface EmployeeInfoCardProps {
  employee: Employee | null;
}

export default function EmployeeInfoCard({ employee }: EmployeeInfoCardProps) {
  // const [currentStatus, setCurrentStatus] = useState<'Present' | 'Absent' | 'Late'>('Present');
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
    // const fetchTodayStatus = async () => {
    //   const today = new Date().toISOString().split('T')[0];
    //   try {
    //     const response = await fetch(`/api/attendance/today?employeeId=${employee.id}&date=${today}`);
    //     const { data } = await response.json();
        
    //     if (data?.status) {
    //       setCurrentStatus(data.status);
    //     }
    //   } catch (error) {
    //     console.error('Error fetching today status:', error);
    //   }
    // };

    // fetchTodayStatus();
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

  const infoFields = [
    {
      label: 'Name',
      value: employee.name || 'Not provided',
    },
    {
      label: 'Employee ID',
      value: employee.employee_id || 'Not provided',
    },
    {
      label: 'Role',
      value: employee.roles?.role_name || 'Not provided',
    },
    {
      label: 'Current Time',
      value: currentTime || 'Not provided',
    },
    // {
    //   label: 'Current Status',
    //   value: getStatusColor(currentStatus) || 'Not provided',
    // },
    {
      label: 'Email',
      value: employee.email || 'Not provided'
    },
    {
      label: 'Department',
      value: employee.departments?.name || 'Not assigned'
    },
    {
      label: 'Phone',
      value: employee.phone || 'Not provided'
    },
    {
      label: 'Type',
      value: employee.employment_type || 'Not specified'
    },
    {
      label: 'Address',
      value: employee.address || 'Not provided'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Section */}
      {/* Information Section */}
      <div className="bg-[#111111] rounded-lg p-6 border border-[#333333]">
        <div className="space-y-4">
          {infoFields.map((field, index) => (
            <div key={index} className="flex items-start gap-3">
              <div>
                <p className="text-sm text-gray-400">{field.label}</p>
                <p className="text-white font-medium">{field.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}