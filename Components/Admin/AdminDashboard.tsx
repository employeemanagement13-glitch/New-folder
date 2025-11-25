// app/admin/dashboard/page.tsx
'use client';
import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Calendar, Users } from 'lucide-react';

// Components
import StatCard from '../StatCard';
import DataTable from '../DataTable';
import FilterSelect from '../FilterSelect';
import SectionHeader from '../SectionHeader';
import LineChart from '../charts/LineChart';
import BarChart from '../charts/BarChart';
// import AdminNavbar from './AdminNavbar';
// import AdminSidebar from './AdminSidebar';

// Data functions
import {
  fetchDashboardStats,
  fetchEmployeeGrowthAnalytics,
  fetchDepartmentPerformance,
  fetchDepartmentComparison,
  type DashboardStats,
  type EmployeeGrowthData,
  type DepartmentPerformanceData,
  type DepartmentComparisonData
} from '@/lib/Admin/data-table';
import AttendanceSectionDashboard from './AttendanceSectionDashboard';

// Constants
const MONTHS = [
  { value: "", label: "All Months" },
  { value: "01", label: "January" }, { value: "02", label: "February" }, { value: "03", label: "March" },
  { value: "04", label: "April" }, { value: "05", label: "May" }, { value: "06", label: "June" },
  { value: "07", label: "July" }, { value: "08", label: "August" }, { value: "09", label: "September" },
  { value: "10", label: "October" }, { value: "11", label: "November" }, { value: "12", label: "December" }
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS_OPTIONS = [
  { value: "", label: "All Years" },
  { value: (CURRENT_YEAR - 1).toString(), label: (CURRENT_YEAR - 1).toString() },
  { value: CURRENT_YEAR.toString(), label: CURRENT_YEAR.toString() },
];

export default function AdminDashboard() {
  // State
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [employeeAnalytics, setEmployeeAnalytics] = useState<EmployeeGrowthData[]>([]);
  const [departmentPerformance, setDepartmentPerformance] = useState<DepartmentPerformanceData[]>([]);
  const [departmentComparison, setDepartmentComparison] = useState<DepartmentComparisonData[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [employeeYearFilter, setEmployeeYearFilter] = useState("");

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { isLoaded, user } = useUser();

  // Fetch data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [
        statsData,
        employeeData,
        departmentData,
        comparisonData
      ] = await Promise.all([
        fetchDashboardStats(),
        fetchEmployeeGrowthAnalytics(),
        fetchDepartmentPerformance(),
        fetchDepartmentComparison()
      ]);

      setStats(statsData);
      setEmployeeAnalytics(employeeData);
      setDepartmentPerformance(departmentData);
      setDepartmentComparison(comparisonData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtered data
  const filteredEmployeeData = employeeAnalytics.filter(row => 
    !employeeYearFilter || row.year === employeeYearFilter
  ).sort((a, b) => b.month_year.localeCompare(a.month_year));

  const filteredDepartmentData = departmentPerformance.filter(row => {
    if (selectedDepartment && row.department_name !== selectedDepartment) return false;
    if (selectedYear && !row.performance_month.includes(selectedYear)) return false;
    return true;
  });

  // Chart data
  const headcountData = filteredEmployeeData
    .slice(-7)
    .map(row => ({
      month: row.month.substring(0, 3),
      totalEmployees: row.total_employees,
    }));

  const departmentChartData = departmentComparison.map(dept => ({
    department: dept.department_name,
    attendance_rate: Math.round(dept.attendance_rate),
    total_employees: dept.total_employees,
    monthly_hires: dept.monthly_hires,
    active_leaves: dept.active_leaves
  }));

  // Get unique values for filters
  const departments = [
    { value: "", label: "All Departments" },
    ...Array.from(new Set(departmentPerformance.map(d => d.department_name)))
      .map(dept => ({ value: dept, label: dept }))
  ];

  const employeeYears = [
    { value: "", label: "All Years" },
    ...Array.from(new Set(employeeAnalytics.map(e => e.year)))
      .map(year => ({ value: year, label: year }))
  ];

  const departmentYears = [
    { value: "", label: "All Years" },
    ...Array.from(new Set(departmentPerformance.map(d => d.performance_month.split('-')[0])))
      .map(year => ({ value: year, label: year }))
  ];

  // Table columns
  const employeeColumns = [
    { key: 'month', label: 'Month' },
    { key: 'year', label: 'Year' },
    { key: 'new_hires', label: 'New Hires' },
    { key: 'exits', label: 'Exits' },
    { 
      key: 'net_growth', 
      label: 'Net Growth',
      render: (value: any, row: any) => {
        const netGrowth = row.new_hires - row.exits;
        return `${Math.max(0, netGrowth)}%`;
      }
    },
    { key: 'total_employees', label: 'Total Employees' }
  ];

  const departmentColumns = [
    { key: 'department_name', label: 'Department' },
    { key: 'manager_name', label: 'Manager' },
    { key: 'new_hires', label: 'New Hires' },
    { 
      key: 'avg_rating', 
      label: 'Avg Rating',
      render: (value: number) => `${value.toFixed(1)}/5`
    },
    { 
      key: 'avg_attendance', 
      label: 'Avg Attendance',
      render: (value: number) => `${Math.round(value)}%`
    },
    { key: 'total_employees', label: 'Total Employees' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#171717] text-white flex items-center justify-center">
        <div className="text-xl">Loading Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#171717] text-white font-sans flex">
      {/* Sidebar */}
      {/* <AdminSidebar 
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        userName={user?.fullName}
        userEmail={user?.emailAddresses?.[0]?.emailAddress}
      /> */}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* <AdminNavbar 
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          pageTitle="HR Admin Dashboard"
        /> */}

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="space-y-8">
            {/* Stats Section */}
            <section>
              <SectionHeader title="Key Metrics" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard 
                  title="Total Employees" 
                  value={stats?.totalEmployees || 0} 
                />
                <StatCard 
                  title="Departments" 
                  value={stats?.totalDepartments || 0} 
                />
                <StatCard 
                  title="Attendance %" 
                  value={stats?.attendancePercentage || 0} 
                  unit="%"
                />
                <StatCard 
                  title="Ongoing Leaves" 
                  value={stats?.ongoingLeaves || 0} 
                />
              </div>
            </section>

            {/* Employee Analytics */}
            {/* <section className="bg-[#111111] rounded-xl border border-[#333333] p-6"> */}
              <SectionHeader 
                title="Employee Growth Analytics"
                actions={
                  <>
                    <FilterSelect
                      options={employeeYears}
                      value={employeeYearFilter}
                      onChange={setEmployeeYearFilter}
                      icon={<Calendar size={16} />}
                      placeholder="Filter by year"
                    />
                  </>
                }
              />
              
              <DataTable
                columns={employeeColumns}
                data={filteredEmployeeData}
                emptyMessage="No employee analytics data available"
              />
            {/* </section> */}

            {/* Headcount Chart */}
            <section className="bg-[#111111] rounded-xl border border-[#333333] p-6">
              <SectionHeader title="Employee Headcount Trend (Last 7 Months)" />
              <LineChart
                data={headcountData}
                dataKey="totalEmployees"
                xAxisKey="month"
                height={300}
              />
            </section>

            {/* Department Performance */}
            {/* <section className="bg-[#111111] rounded-xl border border-[#333333] p-6"> */}
              <SectionHeader 
                title="Department Performance"
                actions={
                  <>
                    <FilterSelect
                      options={departments}
                      value={selectedDepartment}
                      onChange={setSelectedDepartment}
                      icon={<Users size={16} />}
                      placeholder="All Departments"
                    />
                    <FilterSelect
                      options={departmentYears}
                      value={selectedYear}
                      onChange={setSelectedYear}
                      icon={<Calendar size={16} />}
                      placeholder="All Years"
                    />
                  </>
                }
              />
              
              <DataTable
                columns={departmentColumns}
                data={filteredDepartmentData}
                emptyMessage="No department performance data available"
              />
            {/* </section> */}

            {/* Department Comparison */}
            <section className="bg-[#111111] rounded-xl border border-[#333333] p-6">
              <SectionHeader title="Department Comparison" />
              <BarChart
                data={departmentChartData}
                dataKey="attendance_rate"
                xAxisKey="department"
                height={400}
              />
            </section>
          </div>

        </main>
          <AttendanceSectionDashboard />
      </div>
    </div>
  );
}