'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import DataTable from '@/Components/DataTable';
import SectionHeader from '@/Components/SectionHeader';

interface EmployeeData {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  department_id: string;
  role_id: string;
}

interface AttendanceRecord {
  id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  total_hours: number | null;
  status: string;
  regularized: boolean;
}

interface EmployeeAttendanceClientProps {
  managerId: string;
  employeeId: string;
  employeeData: EmployeeData;
}

export default function EmployeeAttendanceClient({ managerId, employeeId, employeeData }: EmployeeAttendanceClientProps) {
  const router = useRouter();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendanceRecords();
  }, [employeeId]);

  const fetchAttendanceRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabaseAdmin
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeId)
        .order('date', { ascending: false })
        .limit(30);

      if (data) {
        setAttendanceRecords(data);
      }
    } catch (error) {
      console.error('Error fetching attendance records:', error);
    } finally {
      setLoading(false);
    }
  };

  const attendanceColumns = [
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    },
    {
      key: 'check_in',
      label: 'Check In',
      sortable: true,
      render: (value: string | null) => value || 'Not recorded'
    },
    {
      key: 'check_out',
      label: 'Check Out',
      sortable: true,
      render: (value: string | null) => value || 'Not recorded'
    },
    {
      key: 'total_hours',
      label: 'Total Hours',
      sortable: true,
      render: (value: number | null) => value ? `${value}h` : 'N/A'
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string) => (
        <span className={`px-2 py-1 rounded-full text-xs ${
          value === 'present' 
            ? 'bg-green-500/20 text-green-400'
            : value === 'late'
            ? 'bg-yellow-500/20 text-yellow-400'
            : value === 'absent'
            ? 'bg-red-500/20 text-red-400'
            : 'bg-gray-500/20 text-gray-400'
        }`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      )
    },
    {
      key: 'regularized',
      label: 'Regularized',
      sortable: true,
      render: (value: boolean) => (
        <span className={`px-2 py-1 rounded-full text-xs ${
          value 
            ? 'bg-blue-500/20 text-blue-400'
            : 'bg-gray-500/20 text-gray-400'
        }`}>
          {value ? 'Yes' : 'No'}
        </span>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-[#171717] text-white p-6">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center text-[#ff9d00] hover:text-[#e68e00] transition-colors mb-4"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </button>
        
        <h1 className="text-2xl font-bold mb-2">Attendance Details</h1>
        <p className="text-gray-400">
          Employee: {employeeData.name} ({employeeData.employee_id})
        </p>
      </div>

      <div className="bg-[#111111] rounded-lg p-6">
        <SectionHeader 
          title="Attendance History"
          description="Last 30 days of attendance records"
        />
        <DataTable 
          columns={attendanceColumns}
          data={attendanceRecords}
          loading={loading}
          emptyMessage="No attendance records found"
        />
      </div>
    </div>
  );
}