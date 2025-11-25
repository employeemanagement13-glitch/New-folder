// components/AttendanceSectionDashboard.tsx
'use client';
import { useState, useEffect, useMemo } from 'react';
import { Search, Calendar, Users, Info, Download } from 'lucide-react';

// Reusable Components
import DataTable from '../DataTable';
import FilterSelect from '../FilterSelect';
import SectionHeader from '../SectionHeader';
import LineChart from '../charts/LineChart';

// Data functions
import {
  fetchAttendanceRecords,
  fetchAttendanceStats,
  fetchAttendanceChartData,
  fetchDepartments,
  type AttendanceRecord,
  type AttendanceStats
} from '@/lib/Admin/attendance-data';

// Types
interface Department {
  id: string;
  name: string;
}

const AttendanceSectionDashboard = () => {
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Fetch data when filters change
  useEffect(() => {
    if (selectedDate) {
      loadFilteredData();
    }
  }, [selectedDepartment, selectedDate]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [depts, chartData] = await Promise.all([
        fetchDepartments(),
        fetchAttendanceChartData()
      ]);
      
      setDepartments(depts);
      setChartData(chartData);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFilteredData = async () => {
    try {
      setLoading(true);
      const [records, statistics] = await Promise.all([
        fetchAttendanceRecords({
          department: selectedDepartment || undefined,
          date: selectedDate
        }),
        fetchAttendanceStats(selectedDepartment || undefined, selectedDate)
      ]);

      setAttendanceData(records);
      setStats(statistics);
    } catch (error) {
      console.error('Error loading filtered data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return attendanceData;

    const lowerSearchTerm = searchTerm.toLowerCase();
    return attendanceData.filter(record =>
      record.employee_name.toLowerCase().includes(lowerSearchTerm) ||
      record.employee_code.toLowerCase().includes(lowerSearchTerm)
    );
  }, [attendanceData, searchTerm]);

  // Department options for filter
  const departmentOptions = useMemo(() => [
    { value: '', label: 'All Departments' },
    ...departments.map(dept => ({ value: dept.name, label: dept.name }))
  ], [departments]);

  // Table columns configuration
  const tableColumns = [
    { 
      key: 'employee_code', 
      label: 'Employee ID',
      render: (value: string) => (
        <span className="font-mono text-sm">{value}</span>
      )
    },
    { key: 'employee_name', label: 'Employee Name' },
    { key: 'department_name', label: 'Department' },
    { 
      key: 'date', 
      label: 'Date',
      render: (value: string) => (
        <span className="whitespace-nowrap">
          {new Date(value).toLocaleDateString('en-US', { 
            day: '2-digit', 
            month: 'short',
            year: 'numeric'
          })}
        </span>
      )
    },
    { 
      key: 'check_in', 
      label: 'Check In',
      render: (value: string | null) => (
        <span className="whitespace-nowrap">
          {value ? 
            new Date(`2000-01-01T${value}`).toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: true 
            }) : 
            '--:--'
          }
        </span>
      )
    },
    { 
      key: 'check_out', 
      label: 'Check Out',
      render: (value: string | null) => (
        <span className="whitespace-nowrap">
          {value ? 
            new Date(`2000-01-01T${value}`).toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: true 
            }) : 
            '--:--'
          }
        </span>
      )
    },
    { 
      key: 'total_hours', 
      label: 'Hours',
      render: (value: number | null) => (
        <span>{value ? `${value}h` : '--'}</span>
      )
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (value: string, row: AttendanceRecord) => {
        const statusConfig = {
          present: { color: 'text-green-400', label: 'Present' },
          absent: { color: 'text-red-400', label: 'Absent' },
          late: { color: 'text-yellow-400', label: 'Late' },
          half_day: { color: 'text-orange-400', label: 'Half Day' },
          leave: { color: 'text-blue-400', label: 'On Leave' },
          holiday: { color: 'text-purple-400', label: 'Holiday' },
          weekoff: { color: 'text-gray-400', label: 'Week Off' }
        };

        const config = statusConfig[value as keyof typeof statusConfig] || 
                      { color: 'text-gray-400', label: value };

        return (
          <span className={`font-semibold ${config.color}`}>
            {config.label}
          </span>
        );
      }
    }
  ];

  // Export functionality
  const handleExport = () => {
    const csvContent = [
      ['Employee ID', 'Employee Name', 'Department', 'Date', 'Check In', 'Check Out', 'Hours', 'Status'],
      ...filteredData.map(record => [
        record.employee_code,
        record.employee_name,
        record.department_name,
        record.date,
        record.check_in || '--:--',
        record.check_out || '--:--',
        record.total_hours ? `${record.total_hours}h` : '--',
        record.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-${selectedDate}-${selectedDepartment || 'all'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const isFilterRequired = !selectedDate;

  return (
    <div className="min-h-fit p-4 sm:p-6 lg:p-8">
      <div className="max-w-full mx-auto space-y-8">
        {/* Stats Cards */}
        {/* {stats && (
          <section>
            <SectionHeader title="Attendance Overview" />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard 
                title="Total Employees" 
                value={stats.totalEmployees} 
              />
              <StatCard 
                title="Present" 
                value={stats.presentCount} 
                trend={stats.totalEmployees > 0 ? 
                  (stats.presentCount / stats.totalEmployees) * 100 : 0
                }
              />
              <StatCard 
                title="Absent" 
                value={stats.absentCount} 
              />
              <StatCard 
                title="Late" 
                value={stats.lateCount} 
              />
              <StatCard 
                title="Attendance Rate" 
                value={stats.attendanceRate} 
                unit="%"
              />
            </div>
          </section>
        )} */}

        {/* Attendance Table Section */}
        <section className="bg-[#111111] rounded-xl border border-[#333333] p-6">
          <SectionHeader 
            title="Attendance Percentage"
            description=""
            actions={
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-center justify-center">
                {/* Search Input */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search employees"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-56 p-2 pl-10 rounded-lg bg-black border border-[#333333] text-white text-sm"
                  />
                  <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>

                {/* Department Filter */}
                <FilterSelect
                  options={departmentOptions}
                  value={selectedDepartment}
                  onChange={setSelectedDepartment}
                  icon={<Users size={16} />}
                  placeholder="Departments"
                />

                {/* Date Filter */}
                <div className="relative">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full sm:w-48 p-2 pl-9 pr-2 rounded-lg bg-black border border-[#333333] text-white text-sm scheme-dark"
                  />
                  <Calendar size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>

                {/* Export Button */}
                <button
                  onClick={handleExport}
                  disabled={filteredData.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-[#ff9d00] hover:bg-[#e68e00] disabled:bg-gray-600 text-black rounded-lg text-sm font-medium transition-colors"
                >
                  <Download size={16} />
                  Export
                </button>
              </div>
            }
          />

          {/* Filter Required Message */}
          {!loading && isFilterRequired && (
            <div className="flex items-center p-4 mb-6 rounded-lg bg-[#2c2200] border border-[#664400] text-yellow-300 text-sm">
              <Info size={18} className="mr-3 flex-shrink-0" />
              <p>
                Please select a <span className="font-semibold">Date</span> to view attendance records.
              </p>
            </div>
          )}

          {/* Data Table */}
          <DataTable
            columns={tableColumns}
            data={filteredData}
            loading={loading}
            emptyMessage={
              isFilterRequired 
                ? "Please select a date to view attendance records"
                : "No attendance records found for the selected filters"
            }
            className="mt-6"
          />
        </section>

        {/* Attendance Trend Chart */}
        <section className="bg-[#111111] rounded-xl border border-[#333333] p-6">
          <SectionHeader 
            title="Attendance Trend (Last 15 Days)"
            description="Daily attendance rate overview"
          />
          <LineChart
            data={chartData}
            dataKey="attendance_rate"
            xAxisKey="date"
            height={400}
            strokeColor="#FBBF24"
            tooltip={{
              formatter: (value: any) => [`${Number(value).toFixed(1)}%`, 'Attendance Rate'],
              labelFormatter: (label: any) => `Date: ${label}`
            }}
          />
        </section>
      </div>
    </div>
  );
};

export default AttendanceSectionDashboard;