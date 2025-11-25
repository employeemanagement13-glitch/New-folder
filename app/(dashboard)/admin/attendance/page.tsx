// app/admin/attendance/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import DataTable from '@/Components/DataTable';
import SectionHeader from '@/Components/SectionHeader';
import FilterSelect from '@/Components/FilterSelect';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { Users } from 'lucide-react';

interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee: {
    name: string;
    employee_id: string;
    department: {
      id: string;
      name: string;
    };
    role: {
      role_name: string;
    };
  };
  date: string;
  status: 'present' | 'absent' | 'late' | 'half_day' | 'leave';
  check_in: string | null;
  check_out: string | null;
  total_hours: number | null;
}

interface AttendanceSummary {
  employee_id: string;
  employee_name: string;
  department_name: string;
  days_present: number;
  days_absent: number;
  days_leaves: number;
  work_days: string;
  attendance_percentage: number;
}

interface Department {
  id: string;
  name: string;
}

export default function AdminAttendancePage() {
  const { userId, isLoaded } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Separate filters for Attendance Records
  const [recordsSearch, setRecordsSearch] = useState('');
  const [recordsDepartment, setRecordsDepartment] = useState('');
  const [recordsDate, setRecordsDate] = useState('');

  // Separate filters for Attendance Summary
  const [summarySearch, setSummarySearch] = useState('');
  const [summaryDepartment, setSummaryDepartment] = useState('');

  // Fetch departments for filters
  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('departments')
        .select('id, name')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  // Fetch ALL attendance records (without filters)
  const fetchAllAttendanceRecords = async () => {
    try {
      const { data: attendanceData, error: attendanceError } = await supabaseAdmin
        .from('attendance')
        .select('*')
        .order('date', { ascending: false });

      if (attendanceError) throw attendanceError;

      if (!attendanceData || attendanceData.length === 0) {
        setAttendanceRecords([]);
        return [];
      }

      // Get employee IDs from attendance records
      const employeeIds = [...new Set(attendanceData.map(record => record.employee_id))];

      // Fetch employees with basic info only
      const { data: employeesData, error: employeesError } = await supabaseAdmin
        .from('employees')
        .select(`
          id,
          name,
          employee_id,
          department_id,
          role_id
        `)
        .in('id', employeeIds);

      if (employeesError) throw employeesError;

      // Get departments separately
      const { data: departmentsData, error: deptError } = await supabaseAdmin
        .from('departments')
        .select('id, name')
        .in('id', [...new Set(employeesData?.map(emp => emp.department_id).filter(Boolean) || [])]);

      if (deptError) throw deptError;

      // Get roles separately
      const { data: rolesData, error: rolesError } = await supabaseAdmin
        .from('roles')
        .select('id, role_name')
        .in('id', [...new Set(employeesData?.map(emp => emp.role_id).filter(Boolean) || [])]);

      if (rolesError) throw rolesError;

      // Create lookup maps
      const departmentMap = new Map();
      departmentsData?.forEach(dept => {
        departmentMap.set(dept.id, dept);
      });

      const roleMap = new Map();
      rolesData?.forEach(role => {
        roleMap.set(role.id, role);
      });

      // Combine the data
      const combinedData = attendanceData.map(record => {
        const employee = employeesData?.find(emp => emp.id === record.employee_id);
        
        const department = employee?.department_id ? departmentMap.get(employee.department_id) : null;
        const role = employee?.role_id ? roleMap.get(employee.role_id) : null;

        return {
          ...record,
          employee: {
            name: employee?.name || 'Unknown Employee',
            employee_id: employee?.employee_id || 'N/A',
            department: department || { id: '', name: 'Unknown Department' },
            role: role || { role_name: 'Unknown Role' }
          }
        };
      });

      return combinedData;
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      return [];
    }
  };

  // Apply filters to attendance records (client-side)
  const applyRecordsFilters = (data: AttendanceRecord[]) => {
    let filteredData = data;

    // Apply department filter
    if (recordsDepartment) {
      filteredData = filteredData.filter(record => 
        record.employee.department?.id === recordsDepartment
      );
    }

    // Apply date filter
    if (recordsDate) {
      filteredData = filteredData.filter(record => record.date === recordsDate);
    }

    // Apply search filter
    if (recordsSearch) {
      filteredData = filteredData.filter(record =>
        record.employee.name.toLowerCase().includes(recordsSearch.toLowerCase()) ||
        record.employee.employee_id.toLowerCase().includes(recordsSearch.toLowerCase()) ||
        record.employee.department.name.toLowerCase().includes(recordsSearch.toLowerCase())
      );
    }

    return filteredData;
  };

  // Fetch and update attendance records
  const updateAttendanceRecords = async () => {
    const allRecords = await fetchAllAttendanceRecords();
    const filteredRecords = applyRecordsFilters(allRecords);
    setAttendanceRecords(filteredRecords);
  };

  // REMOVED RPC CALL - Directly calculate summary
  const fetchAttendanceSummary = async () => {
    try {
      await calculateAttendanceSummary();
    } catch (error) {
      console.error('Error calculating attendance summary:', error);
    }
  };

  // Client-side calculation of attendance summary
  const calculateAttendanceSummary = async () => {
    try {
      const { data: employees, error } = await supabaseAdmin
        .from('employees')
        .select(`
          id,
          name,
          employee_id,
          department_id
        `)
        .eq('status', 'active');

      if (error) throw error;

      // Get departments for mapping
      const { data: departmentsData, error: deptError } = await supabaseAdmin
        .from('departments')
        .select('id, name');

      if (deptError) throw deptError;

      const departmentMap = new Map();
      departmentsData?.forEach(dept => {
        departmentMap.set(dept.id, dept.name);
      });

      const summaryPromises = employees?.map(async (employee) => {
        const currentDate = new Date();
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        const { data: attendance, error: attendanceError } = await supabaseAdmin
          .from('attendance')
          .select('status, date')
          .eq('employee_id', employee.id)
          .gte('date', monthStart.toISOString().split('T')[0])
          .lte('date', monthEnd.toISOString().split('T')[0]);

        if (attendanceError) throw attendanceError;

        const daysPresent = attendance?.filter(a => a.status === 'present').length || 0;
        const daysAbsent = attendance?.filter(a => a.status === 'absent').length || 0;
        const daysLeaves = attendance?.filter(a => a.status === 'leave').length || 0;

        const totalWorkingDays = calculateWorkingDays(monthStart, monthEnd);
        const attendancePercentage = totalWorkingDays > 0 ?
          Math.round((daysPresent / totalWorkingDays) * 100) : 0;

        return {
          employee_id: employee.employee_id,
          employee_name: employee.name,
          department_name: departmentMap.get(employee.department_id) || 'Unknown Department',
          days_present: daysPresent,
          days_absent: daysAbsent,
          days_leaves: daysLeaves,
          work_days: 'Mon - Fri',
          attendance_percentage: attendancePercentage
        };
      }) || [];

      const summary = await Promise.all(summaryPromises);
      setAttendanceSummary(summary);
    } catch (error) {
      console.error('Error calculating attendance summary:', error);
    }
  };

  const calculateWorkingDays = (start: Date, end: Date) => {
    let count = 0;
    const current = new Date(start);

    while (current <= end) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) count++;
      current.setDate(current.getDate() + 1);
    }

    return count;
  };

  // Format time for display
  const formatTime = (time: string | null) => {
    if (!time) return '-';
    try {
      const [hours, minutes, seconds] = time.split(':');
      const hour = parseInt(hours);
      const minute = parseInt(minutes);
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
    } catch {
      return time;
    }
  };

  useEffect(() => {
    if (isLoaded && userId) {
      fetchDepartments();
      updateAttendanceRecords();
      fetchAttendanceSummary();
      setLoading(false);
    }
  }, [isLoaded, userId]);

  // Refetch when records filters change
  useEffect(() => {
    if (userId) {
      updateAttendanceRecords();
    }
  }, [recordsDepartment, recordsDate, recordsSearch, userId]);

  // Filter summary data based on search and department
  const filteredSummary = attendanceSummary.filter(summary => {
    const matchesSearch = summarySearch === '' || 
      summary.employee_name.toLowerCase().includes(summarySearch.toLowerCase()) ||
      summary.employee_id.toLowerCase().includes(summarySearch.toLowerCase()) ||
      summary.department_name.toLowerCase().includes(summarySearch.toLowerCase());

    const matchesDepartment = summaryDepartment === '' || 
      summary.department_name === departments.find(d => d.id === summaryDepartment)?.name;

    return matchesSearch && matchesDepartment;
  });

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const statusConfig = {
      present: { label: 'Present', className: 'bg-green-500/20 text-green-400 border border-green-500/30' },
      absent: { label: 'Absent', className: 'bg-red-500/20 text-red-400 border border-red-500/30' },
      late: { label: 'Late', className: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
      half_day: { label: 'Half Day', className: 'bg-orange-500/20 text-orange-400 border border-orange-500/30' },
      leave: { label: 'Leave', className: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      className: 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
    };

    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.className}`}>
        {config.label}
      </span>
    );
  };

  // Table columns for attendance records
  const recordColumns = [
    {
      key: 'employee_id',
      label: 'Emp ID',
      render: (value: any, row: any) => row.employee.employee_id
    },
    {
      key: 'employee_name',
      label: 'Emp Name',
      render: (value: any, row: any) => row.employee.name
    },
    {
      key: 'date',
      label: 'Date',
      render: (value: any, row: any) => {
        const date = new Date(row.date);
        return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
      }
    },
    {
      key: 'department',
      label: 'Department',
      render: (value: any, row: any) => row.employee.department.name
    },
    {
      key: 'role',
      label: 'Role',
      render: (value: any, row: any) => row.employee.role.role_name
    },
    {
      key: 'check_in',
      label: 'Check In',
      render: (value: any, row: any) => formatTime(row.check_in)
    },
    {
      key: 'check_out',
      label: 'Check Out',
      render: (value: any, row: any) => formatTime(row.check_out)
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: any, row: any) => <StatusBadge status={row.status} />
    },
    {
      key: 'total_hours',
      label: 'Hours',
      render: (value: any, row: any) => row.total_hours ? `${row.total_hours.toFixed(1)}h` : '-'
    },
  ];

  // Table columns for attendance summary
  const summaryColumns = [
    {
      key: 'employee_id',
      label: 'Emp ID',
    },
    {
      key: 'employee_name',
      label: 'Emp Name',
    },
    {
      key: 'department_name',
      label: 'Department',
    },
    {
      key: 'days_present',
      label: 'Days Present',
    },
    {
      key: 'days_absent',
      label: 'Days Absent',
    },
    {
      key: 'days_leaves',
      label: 'Days Leaves',
    },
    {
      key: 'work_days',
      label: 'Work Days',
    },
    {
      key: 'attendance_percentage',
      label: 'Att Percentage',
      render: (value: any, row: any) => (
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${
            row.attendance_percentage >= 90 ? 'text-green-400' :
            row.attendance_percentage >= 75 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {row.attendance_percentage}%
          </span>
          <div className="w-16 bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                row.attendance_percentage >= 90 ? 'bg-green-500' :
                row.attendance_percentage >= 75 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(row.attendance_percentage, 100)}%` }}
            />
          </div>
        </div>
      )
    },
  ];

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#171717]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#ff9d00]"></div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#171717]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Authentication Required</h2>
          <p className="text-gray-400">Please sign in to access the attendance page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 bg-[#171717] min-h-screen">
      {/* Header */}
      <SectionHeader
        title="Attendance Management"
        description=""
        actions={
          <div className="flex flex-col md:flex-row md:flex-wrap gap-4 w-fit">
            {/* Search */}
            <div className="relative flex-1 w-fit">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search records..."
                value={recordsSearch}
                onChange={(e) => setRecordsSearch(e.target.value)}
                className="w-full sm:w-64 p-2 pl-10 rounded-lg bg-black border border-[#333333] text-white text-sm"
              />
            </div>

            {/* Department Filter */}
            <div className="w-fit">
              <FilterSelect
                options={[
                  { value: '', label: 'All Departments' },
                  ...departments.map(dept => ({ value: dept.id, label: dept.name }))
                ]}
                value={recordsDepartment}
                onChange={setRecordsDepartment}
                placeholder="Department"
                icon={<Users className="w-4 h-4" />}
              />
            </div>

            {/* Date Filter */}
            <div className="w-fit">
              <input
                type="date"
                value={recordsDate}
                onChange={(e) => setRecordsDate(e.target.value)}
                className="bg-black border border-[#333333] rounded-lg px-3 py-2 text-white text-sm w-36 scheme-dark"
              />
            </div>

            {/* Clear Filters */}
            <div className="w-fit">
              <button
                onClick={() => {
                  setRecordsDepartment('');
                  setRecordsDate('');
                  setRecordsSearch('');
                }}
                className="px-4 py-2 text-black rounded-lg bg-[#ff9d00] hover:bg-[#e68e00] transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        }
        className='justify-between gap-10'
      />

      {/* Attendance Records Section */}
      <section>
        {/* Records Table */}
        <DataTable
          columns={recordColumns}
          data={attendanceRecords}
          loading={loading}
          emptyMessage={
            attendanceRecords.length === 0
              ? "No attendance records found."
              : "No records match your search criteria."
          }
        />
      </section>

      {/* Attendance Summary Section */}
      <section className='my-6'>
        <SectionHeader
          title="Attendance Summary"
          className="justify-between gap-10"
          actions={
            <div className="flex flex-col md:flex-row md:flex-wrap gap-4 w-fit">
              {/* Search */}
              <div className="relative flex-1 w-fit">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search summary..."
                  value={summarySearch}
                  onChange={(e) => setSummarySearch(e.target.value)}
                  className="w-full sm:w-64 p-2 pl-10 rounded-lg bg-black border border-[#333333] text-white text-sm"
                />
              </div>

              {/* Department Filter */}
              <div className="w-fit">
                <FilterSelect
                  options={[
                    { value: '', label: 'All Departments' },
                    ...departments.map(dept => ({ value: dept.id, label: dept.name }))
                  ]}
                  value={summaryDepartment}
                  onChange={setSummaryDepartment}
                  placeholder="Department"
                  icon={<Users className="w-4 h-4" />}
                />
              </div>

              {/* Clear Search */}
              <div className="w-fit">
                <button
                  onClick={() => {
                    setSummarySearch('');
                    setSummaryDepartment('');
                  }}
                  className="px-4 py-2 text-black rounded-lg bg-[#ff9d00] hover:bg-[#e68e00] transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          }
        />

        {/* Summary Table */}
        <DataTable
          columns={summaryColumns}
          data={filteredSummary}
          loading={loading}
          emptyMessage={
            attendanceSummary.length === 0
              ? "No attendance summary available."
              : "No summary data matches your search criteria."
          }
        />
      </section>
    </div>
  );
}