'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import DataTable from '@/Components/DataTable';
import FilterSelect from '@/Components/FilterSelect';
import { Button } from '@/Components/ui/button';
import StatCard from '@/Components/StatCard';
import SectionHeader from '@/Components/SectionHeader';

interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in: string;
  check_out: string | null;
  total_hours: number | null;
  status: string;
  department_name: string;
  employee_name: string;
  employee_emp_id: string;
}

interface EmployeeData {
  id: string;
  employee_id: string;
  name: string;
  department_id: string;
  department_name: string;
}

// Create a single supabase client instance outside the component
const supabase = createClientComponentClient();

export default function EmployeeAttendancePage() {
  const params = useParams();
  const empId = params.id as string;

  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    period: '', // week, month
    specificDate: '' // YYYY-MM-DD format for native date input
  });

  // Fetch employee data and attendance records
  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      if (!mounted) return;
      
      try {
        setLoading(true);
        setError(null);

        console.log('Fetching data for employee:', empId);

        // 1. First fetch employee basic info
        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .select('id, employee_id, name, department_id')
          .eq('id', empId)
          .single();

        if (employeeError) {
          console.error('Employee fetch error:', employeeError);
          throw new Error(`Failed to fetch employee: ${employeeError.message}`);
        }

        if (!employeeData) {
          throw new Error('Employee not found');
        }

        // 2. Fetch department name separately
        const { data: departmentData, error: deptError } = await supabase
          .from('departments')
          .select('name')
          .eq('id', employeeData.department_id)
          .single();

        if (deptError) {
          console.warn('Department fetch warning:', deptError);
        }

        const employee = {
          id: employeeData.id,
          employee_id: employeeData.employee_id,
          name: employeeData.name,
          department_id: employeeData.department_id,
          department_name: departmentData?.name || 'Unknown Department'
        };

        if (!mounted) return;
        setEmployeeData(employee);

        // 3. Fetch attendance records for this employee
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance')
          .select('*')
          .eq('employee_id', empId)
          .order('date', { ascending: false });

        if (attendanceError) {
          console.error('Attendance fetch error:', attendanceError);
          throw new Error(`Failed to fetch attendance: ${attendanceError.message}`);
        }

        if (!mounted) return;

        // Transform data with all required fields
        const transformedData: AttendanceRecord[] = (attendanceData || []).map(record => ({
          id: record.id,
          employee_id: record.employee_id, // This is the UUID
          employee_emp_id: employee.employee_id, // This is the display EMP ID like "EMP000001"
          date: record.date,
          check_in: record.check_in,
          check_out: record.check_out,
          total_hours: record.total_hours,
          status: record.status,
          department_name: employee.department_name,
          employee_name: employee.name
        }));

        setAttendanceData(transformedData);
        console.log('Successfully fetched attendance records:', transformedData.length);

      } catch (err: any) {
        console.error('Error in fetchData:', err);
        if (mounted) {
          setError(err.message || 'An error occurred while fetching data');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (empId) {
      fetchData();
    } else {
      setLoading(false);
      setError('Employee ID is required');
    }

    return () => {
      mounted = false;
    };
  }, [empId]);

  // Get start of week (Monday)
  const getStartOfWeek = (date: Date) => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(date.setDate(diff));
  };

  // Filter data based on selected filters
  const filteredData = attendanceData.filter(record => {
    if (filters.status && record.status !== filters.status) return false;
    
    const recordDate = new Date(record.date);
    
    // Period filter (week/month)
    if (filters.period) {
      const today = new Date();
      
      switch (filters.period) {
        case 'week':
          const startOfWeek = getStartOfWeek(new Date());
          startOfWeek.setHours(0, 0, 0, 0);
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(endOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);
          return recordDate >= startOfWeek && recordDate <= endOfWeek;
          
        case 'month':
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          endOfMonth.setHours(23, 59, 59, 999);
          return recordDate >= startOfMonth && recordDate <= endOfMonth;
          
        default:
          return true;
      }
    }
    
    // Specific date filter - direct comparison since both are in YYYY-MM-DD format
    if (filters.specificDate) {
      return record.date === filters.specificDate;
    }

    return true;
  });

  // Format time from "HH:MM:SS" to "HH:MM AM/PM"
  const formatTime = (timeString: string | null) => {
    if (!timeString) return '-';
    
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const formattedHour = hour % 12 || 12;
      
      return `${formattedHour}:${minutes} ${ampm}`;
    } catch (err) {
      return timeString;
    }
  };

  // Format date from "YYYY-MM-DD" to "DD/MM/YY"
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear().toString().slice(-2);
      
      return `${day}/${month}/${year}`;
    } catch (err) {
      return dateString;
    }
  };

  // Format total hours
  const formatTotalHours = (hours: number | null) => {
    if (!hours) return '-';
    return `${hours.toFixed(1)}hrs`;
  };

  // Handle specific date change
  const handleSpecificDateChange = (value: string) => {
    setFilters(prev => ({ 
      ...prev, 
      specificDate: value,
      period: '' // Clear period when specific date is selected
    }));
  };

  // Handle period change
  const handlePeriodChange = (value: string) => {
    setFilters(prev => ({ 
      ...prev, 
      period: value,
      specificDate: '' // Clear specific date when period is selected
    }));
  };

  // Table columns
  const columns = [
    {
      key: 'employee_emp_id',
      label: 'EMP ID',
      sortable: true
    },
    {
      key: 'department_name',
      label: 'DEPARTMENT',
      sortable: true
    },
    {
      key: 'check_in',
      label: 'CHECK-IN',
      render: (value: string) => formatTime(value)
    },
    {
      key: 'check_out',
      label: 'CHECK-OUT',
      render: (value: string | null) => formatTime(value)
    },
    {
      key: 'date',
      label: 'DATE',
      render: (value: string) => formatDate(value)
    },
    {
      key: 'total_hours',
      label: 'TOTAL HOURS',
      render: (value: number | null) => formatTotalHours(value)
    },
    {
      key: 'status',
      label: 'STATUS',
      render: (value: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'present' ? 'bg-green-500/20 text-green-400' :
          value === 'late' ? 'bg-yellow-500/20 text-yellow-400' :
          value === 'absent' ? 'bg-red-500/20 text-red-400' :
          'bg-gray-500/20 text-gray-400'
        }`}>
          {value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Unknown'}
        </span>
      )
    }
  ];

  // Filter options
  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'present', label: 'Present' },
    { value: 'late', label: 'Late' },
    { value: 'absent', label: 'Absent' }
  ];

  const periodOptions = [
    { value: '', label: 'All Period' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' }
  ];

  const handleRetry = () => {
    setError(null);
    setLoading(true);
  };

  const handleClearFilters = () => {
    setFilters({ status: '', period: '', specificDate: '' });
  };

  // Create filter actions component
  const filterActions = !error && (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="flex items-center gap-3">
        {/* Status Filter */}
        <FilterSelect
          options={statusOptions}
          value={filters.status}
          onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
          placeholder="Status"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
            </svg>
          }
          className="min-w-[140px]"
        />

        {/* Period Filter (Week/Month) */}
        <FilterSelect
          options={periodOptions}
          value={filters.period}
          onChange={handlePeriodChange}
          placeholder="Period"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
          }
          className="min-w-[140px]"
        />

        {/* Specific Date Filter with Native Date Input */}
        <div className="relative flex items-center">
          <input
            type="date"
            value={filters.specificDate}
            onChange={(e) => handleSpecificDateChange(e.target.value)}
            className="w-full p-2 rounded-lg bg-black border border-[#333333] text-white text-sm [color-scheme:dark]"
            //  focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          />
        </div>
      </div>

      {/* Clear Filters Button */}
      {(filters.status || filters.period || filters.specificDate) && (
        <Button
          onClick={handleClearFilters}
          className="px-4 py-2 bg-[#ff9d00] text-black font-medium text-sm hover:bg-[#ff9d00]/90 transition-colors whitespace-nowrap"
        >
          Clear
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#171717] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Section Header with integrated filters */}
        <SectionHeader
          title="Attendance"
          description={employeeData ? `Showing attendance for ${employeeData.name} (${employeeData.employee_id})` : undefined}
          actions={filterActions}
        />

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-400">{error}</span>
              </div>
              <button
                onClick={handleRetry}
                className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Data Table */}
        {!error && (
          <>
            <div className="mb-6">
              <DataTable
                columns={columns}
                data={filteredData}
                loading={loading}
                emptyMessage={loading ? "Loading attendance records..." : "No attendance records found"}
                className="w-full"
              />
            </div>

            {/* Summary Stats */}
            {!loading && filteredData.length > 0 && (
              <div className="bg-[#111111] rounded-xl border border-[#333333] p-6">
                <SectionHeader
                  title="Attendance Summary"
                  className="mb-4 border-none pb-0"
                />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <StatCard title='Total Records' value={filteredData.length} />
                  <StatCard title='Present Days' value={filteredData.filter(record => record.status === 'present').length} />
                  <StatCard title='Late Days' value={filteredData.filter(record => record.status === 'late').length} />
                  <StatCard title='Absent Days' value={filteredData.filter(record => record.status === 'absent').length} />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}