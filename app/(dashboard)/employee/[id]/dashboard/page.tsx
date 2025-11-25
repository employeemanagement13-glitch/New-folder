'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import DataTable from '@/Components/DataTable';
import FilterSelect from '@/Components/FilterSelect';
import SectionHeader from '@/Components/SectionHeader';
import StatCard from '@/Components/StatCard';
import BarChart from '@/Components/charts/BarChart';
import PieChart from '@/Components/charts/PieChart';

interface EmployeeData {
  id: string;
  employee_id: string;
  name: string;
  department_id: string;
  email: string;
  status: string;
}

interface AttendanceSummary {
  month: string;
  month_year: string;
  attendance_percentage: number;
  present_days: number;
  total_days: number;
  late_days: number;
  absent_days: number;
}

interface LeaveBalance {
  leave_type: string;
  allocated_days: number;
  used_days: number;
  remaining_days: number;
  year: number;
}

interface DashboardData {
  employee: EmployeeData;
  attendance: AttendanceSummary[];
  leave_balances: LeaveBalance[];
  total_remaining_leaves: number;
  total_used_leaves: number;
  department_name: string;
}

// Colors for charts
const LEAVE_COLORS = ['#ff9d00', '#333333'];

export default function EmployeeDashboard() {
  const params = useParams();
  const empId = (params.empId || params.id) as string;

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Independent filters for each section
  const [tableYear, setTableYear] = useState<string>(new Date().getFullYear().toString());
  const [attendanceYear, setAttendanceYear] = useState<string>(new Date().getFullYear().toString());
  const [leaveYear, setLeaveYear] = useState<string>(new Date().getFullYear().toString());

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');

  useEffect(() => {
    if (empId) {
      fetchDashboardData();
    } else {
      setError('Employee ID not found');
      setLoading(false);
    }
  }, [empId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!empId) {
        throw new Error('No employee ID provided');
      }

      // 1. Fetch employee basic info
      const { data: employeeData, error: employeeError } = await supabaseAdmin
        .from('employees')
        .select('id, employee_id, name, email, status, department_id')
        .eq('id', empId)
        .single();

      if (employeeError) {
        throw new Error(`Employee not found: ${employeeError.message}`);
      }

      if (!employeeData) {
        throw new Error('Employee data not found');
      }

      // 2. Fetch department name separately
      let departmentName = 'N/A';
      if (employeeData.department_id) {
        const { data: departmentData, error: deptError } = await supabaseAdmin
          .from('departments')
          .select('name')
          .eq('id', employeeData.department_id)
          .single();

        if (!deptError && departmentData) {
          departmentName = departmentData.name;
        }
      }

      // 3. Fetch ALL attendance data (we'll filter client-side)
      const { data: attendanceData, error: attendanceError } = await supabaseAdmin
        .from('attendance')
        .select('*')
        .eq('employee_id', empId);

      if (attendanceError) {
        console.error('Attendance fetch error:', attendanceError);
      }

      // 4. Fetch ALL leave balances (we'll filter client-side)
      const { data: leaveBalances, error: leaveError } = await supabaseAdmin
        .from('leave_balances')
        .select(`
          allocated_days,
          used_days,
          year,
          leave_types(name)
        `)
        .eq('employee_id', empId);

      if (leaveError) {
        console.error('Leave balances fetch error:', leaveError);
      }

      // Process data
      const processedAttendance = processAttendanceData(attendanceData || []);

      // Calculate totals for current year
      const currentYear = new Date().getFullYear();
      const currentYearLeaveBalances = leaveBalances?.filter(balance => balance.year === currentYear) || [];

      const totalRemaining = currentYearLeaveBalances.reduce((sum, balance) =>
        sum + (balance.allocated_days - balance.used_days), 0);

      const totalUsed = currentYearLeaveBalances.reduce((sum, balance) =>
        sum + balance.used_days, 0);

      const processedLeaveBalances: LeaveBalance[] = leaveBalances?.map(balance => ({
        leave_type: (balance.leave_types as any)?.name || 'Unknown',
        allocated_days: balance.allocated_days,
        used_days: balance.used_days,
        remaining_days: balance.allocated_days - balance.used_days,
        year: balance.year
      })) || [];

      setDashboardData({
        employee: employeeData,
        attendance: processedAttendance,
        leave_balances: processedLeaveBalances,
        total_remaining_leaves: totalRemaining,
        total_used_leaves: totalUsed,
        department_name: departmentName
      });

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      setError(error.message || 'Failed to load dashboard data');
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  };

  const processAttendanceData = (attendanceData: any[]): AttendanceSummary[] => {
    const monthlyData: { [key: string]: AttendanceSummary } = {};

    attendanceData.forEach(record => {
      try {
        const date = new Date(record.date);
        const month = date.toLocaleString('default', { month: 'long' });
        const year = date.getFullYear();
        const monthYear = `${month} ${year}`;

        if (!monthlyData[monthYear]) {
          monthlyData[monthYear] = {
            month: month,
            month_year: monthYear,
            attendance_percentage: 0,
            present_days: 0,
            total_days: 0,
            late_days: 0,
            absent_days: 0
          };
        }

        monthlyData[monthYear].total_days++;

        if (record.status === 'present' || record.status === 'late') {
          monthlyData[monthYear].present_days++;
        }
        if (record.status === 'late') {
          monthlyData[monthYear].late_days++;
        }
        if (record.status === 'absent') {
          monthlyData[monthYear].absent_days++;
        }
      } catch (e) {
        console.error('Error processing attendance record:', record, e);
      }
    });

    // Calculate percentages
    Object.values(monthlyData).forEach(month => {
      month.attendance_percentage = month.total_days > 0 ?
        (month.present_days / month.total_days) * 100 : 0;
    });

    // Sort by month
    const monthsOrder = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    return Object.values(monthlyData).sort((a, b) => {
      return monthsOrder.indexOf(a.month) - monthsOrder.indexOf(b.month);
    });
  };

  // Prepare data for attendance trend chart (bar chart) - filtered by attendanceYear
  const getAttendanceTrendData = () => {
    if (!dashboardData) return [];

    return dashboardData.attendance
      .filter(month => month.month_year.includes(attendanceYear))
      .map(month => ({
        name: month.month,
        attendance: Math.round(month.attendance_percentage),
        present: month.present_days,
        absent: month.absent_days,
        late: month.late_days
      }));
  };

  // Prepare data for leave usage pie chart - filtered by leaveYear
  const getLeaveUsageData = () => {
    if (!dashboardData) return [];

    const yearLeaveBalances = dashboardData.leave_balances.filter(balance =>
      balance.year === parseInt(leaveYear)
    );

    const totalUsed = yearLeaveBalances.reduce((sum, balance) => sum + balance.used_days, 0);
    const totalRemaining = yearLeaveBalances.reduce((sum, balance) => sum + balance.remaining_days, 0);

    return [
      { name: 'Used Leaves', value: totalUsed },
      { name: 'Remaining Leaves', value: totalRemaining }
    ];
  };

  // Filter table data based on search, month, and tableYear
  const getFilteredTableData = () => {
    if (!dashboardData) return [];

    let filtered = dashboardData.attendance;

    // Filter by year for table
    filtered = filtered.filter(item => item.month_year.includes(tableYear));

    // Filter by month
    if (selectedMonth !== 'all') {
      filtered = filtered.filter(item => item.month.toLowerCase().includes(selectedMonth.toLowerCase()));
    }

    // Filter by search term (if needed)
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.month_year.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.attendance_percentage.toString().includes(searchTerm)
      );
    }

    return filtered;
  };

  // Get used days for the selected table year
  const getUsedDaysForTableYear = () => {
    if (!dashboardData) return 0;

    const yearLeaveBalances = dashboardData.leave_balances.filter(balance =>
      balance.year === parseInt(tableYear)
    );

    return yearLeaveBalances.reduce((sum, balance) => sum + balance.used_days, 0);
  };

  // Get remaining leaves for the selected table year
  const getRemainingLeavesForTableYear = () => {
    if (!dashboardData) return 0;

    const yearLeaveBalances = dashboardData.leave_balances.filter(balance =>
      balance.year === parseInt(tableYear)
    );

    return yearLeaveBalances.reduce((sum, balance) => sum + balance.remaining_days, 0);
  };

  // Table columns
  const tableColumns = [
    {
      key: 'month_year',
      label: 'Month',
      sortable: true
    },
    {
      key: 'department',
      label: 'Department',
      render: () => dashboardData?.department_name || 'N/A'
    },
    {
      key: 'attendance_percentage',
      label: 'Attendance %',
      sortable: true,
      render: (value: number) => (
        <div className="flex items-center gap-2">
          <div className="w-16 bg-gray-700 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full"
              style={{ width: `${Math.min(value, 100)}%` }}
            />
          </div>
          <span>{value.toFixed(1)}%</span>
        </div>
      )
    },
    {
      key: 'remaining_leaves',
      label: 'Remain Leaves',
      render: () => getRemainingLeavesForTableYear()
    },
    {
      key: 'used_days',
      label: 'Used Days',
      render: () => getUsedDaysForTableYear()
    },
    {
      key: 'salary',
      label: 'Salary',
      render: () => '200k'
    }
  ];

  // Month options for filter
  const monthOptions = [
    { value: 'all', label: 'All Months' },
    { value: 'january', label: 'January' },
    { value: 'february', label: 'February' },
    { value: 'march', label: 'March' },
    { value: 'april', label: 'April' },
    { value: 'may', label: 'May' },
    { value: 'june', label: 'June' },
    { value: 'july', label: 'July' },
    { value: 'august', label: 'August' },
    { value: 'september', label: 'September' },
    { value: 'october', label: 'October' },
    { value: 'november', label: 'November' },
    { value: 'december', label: 'December' }
  ];

  // Year options for filters
  const yearOptions = [
    { value: '2025', label: '2025' },
    { value: '2024', label: '2024' },
    { value: '2023', label: '2023' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#171717] p-6 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff9d00] mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#171717] p-6 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-red-400 text-lg mb-2">Error</div>
          <p>{error}</p>
          <button
            onClick={() => fetchDashboardData()}
            className="mt-4 px-4 py-2 bg-[#ff9d00] text-black rounded hover:bg-[#e68a00]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-[#171717] p-6 flex items-center justify-center">
        <div className="text-white text-center">
          <p>No data available</p>
          <button
            onClick={() => fetchDashboardData()}
            className="mt-4 px-4 py-2 bg-[#ff9d00] text-black rounded hover:bg-[#e68a00]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const attendanceTrendData = getAttendanceTrendData();
  const leaveUsageData = getLeaveUsageData();
  const filteredTableData = getFilteredTableData();

  return (
    <div className="min-h-screen bg-[#171717] p-6 text-white">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Employee Summary Section */}
        <div className="space-y-4">
          <SectionHeader
            title="Employee Summary"
            actions={
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-64 p-2 pl-9 rounded-lg bg-black border border-[#333333] text-white text-sm"
                    //  focus:ring-blue-500 focus:border-blue-500
                  />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none w-4 h-4"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                </div>

                {/* Month Filter */}
                <FilterSelect
                  options={monthOptions}
                  value={selectedMonth}
                  onChange={setSelectedMonth}
                  placeholder="Select Month"
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                    </svg>
                  }
                  className="w-full sm:w-48"
                />

                {/* Year Filter for Table */}
                <FilterSelect
                  options={yearOptions}
                  value={tableYear}
                  onChange={setTableYear}
                  placeholder="Select Year"
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                    </svg>
                  }
                  className="w-full sm:w-32"
                />
              </div>
            }
          />

          {/* Employee Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              title="Emp ID"
              unit={dashboardData.employee.employee_id}
            />
            <StatCard
              title="Emp Name"
              unit={dashboardData.employee.name}
            />
            <StatCard
              title="Department"
              unit={dashboardData.department_name}
            />
            <StatCard
              title="Remain Leaves"
              unit={getRemainingLeavesForTableYear().toString()}
            />
          </div>

          {/* Main Table */}
          <DataTable
            columns={tableColumns}
            data={filteredTableData}
            loading={loading}
            emptyMessage={`No attendance data available for ${tableYear}`}
            className="mt-4"
          />
        </div>

        {/* Charts Section */}
        <div className="flex flex-col justify-center items-center w-full gap-10">

          {/* Attendance Trend Chart */}
          <div className="space-y-4 w-full">
            <SectionHeader
              title="Attendance Trend"
              actions={
                <FilterSelect
                  options={yearOptions}
                  value={attendanceYear}
                  onChange={setAttendanceYear}
                  placeholder="Year"
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                    </svg>
                  }
                  className="w-32"
                />
              }
            />
            <div className="bg-[#111111] rounded-xl border border-[#333333] p-6">
              {attendanceTrendData.length > 0 ? (
                <BarChart
                  data={attendanceTrendData}
                  dataKey="attendance"
                  xAxisKey="name"
                  fillColor="#ff9d00"
                  height={300}
                  tooltip={{
                    formatter: (value: unknown) => [`${value}%`, 'Attendance']
                  }}
                />
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400">
                  No attendance data for {attendanceYear}
                </div>
              )}
            </div>
          </div>

          {/* Leave Usage Chart */}
          <div className="space-y-4 w-full h-fit">
            <SectionHeader
              title="Leave Usage"
              actions={
                <FilterSelect
                  options={yearOptions}
                  value={leaveYear}
                  onChange={setLeaveYear}
                  placeholder="Year"
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                    </svg>
                  }
                  className="w-32"
                />
              }
            />
            <div className="bg-[#111111] rounded-xl border border-[#333333] px-6 py-12">
              {leaveUsageData.some(item => item.value > 0) ? (
                <div className="h-64">
                  <PieChart
                    data={leaveUsageData}
                    dataKey="value"
                    nameKey="name"
                    colors={LEAVE_COLORS}
                    height={250}
                  />
                  <div className="flex justify-center space-x-4 mt-4">
                    {leaveUsageData.map((entry, index) => (
                      <div key={index} className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: LEAVE_COLORS[index % LEAVE_COLORS.length] }}
                        />
                        <span className="text-sm text-gray-300">
                          {entry.name}: {entry.value} days
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400">
                  No leave data for {leaveYear}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}