"use client"
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import SectionHeader from '@/Components/SectionHeader';

interface EmployeeData {
  name: string;
  employee_id: string;
  department: {
    name: string;
  };
}

interface EmployeeAttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  total_hours: number | null;
  status: string;
  employee: EmployeeData;
}

interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  attendancePercentage: number;
}

export default function EmployeeAttendancePage() {
  const params = useParams();
  const employeeId = params.empId as string;
  const managerId = params.id as string;
  
  const [attendanceData, setAttendanceData] = useState<EmployeeAttendanceRecord[]>([]);
  const [filteredData, setFilteredData] = useState<EmployeeAttendanceRecord[]>([]);
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [stats, setStats] = useState<AttendanceStats>({
    totalDays: 0,
    presentDays: 0,
    lateDays: 0,
    absentDays: 0,
    attendancePercentage: 0
  });
  const [error, setError] = useState<string | null>(null);

  // Format time to AM/PM
  const formatTime = (timeString: string | null) => {
    if (!timeString) return 'Null';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  // Format hours display
  const formatHours = (hours: number | null) => {
    if (!hours) return '0hrs';
    return `${Math.round(hours)}hrs`;
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'present':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'late':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'absent':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  // Format date to DD/MM/YY
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${day}/${month}/${year}`;
  };

  // Calculate attendance percentage and stats
  const calculateStats = (data: EmployeeAttendanceRecord[]) => {
    const totalDays = data.length;
    const presentDays = data.filter(record => record.status === 'present').length;
    const lateDays = data.filter(record => record.status === 'late').length;
    const absentDays = data.filter(record => record.status === 'absent').length;
    const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    return {
      totalDays,
      presentDays,
      lateDays,
      absentDays,
      attendancePercentage
    };
  };

  // Fetch employee data and attendance
  const fetchEmployeeAttendance = async () => {
    if (!employeeId) {
      setError('Employee ID not found');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log("Fetching data for employee:", employeeId);

      // Fetch employee details
      const { data: employeeData, error: employeeError } = await supabaseAdmin
        .from('employees')
        .select('name, employee_id, department_id')
        .eq('id', employeeId)
        .single();

      if (employeeError) {
        console.error('Error fetching employee:', employeeError);
        throw new Error('Failed to load employee data');
      }

      // Fetch department name
      const { data: departmentData, error: deptError } = await supabaseAdmin
        .from('departments')
        .select('name')
        .eq('id', employeeData.department_id)
        .single();

      if (deptError) {
        console.error('Error fetching department:', deptError);
      }

      setEmployee({
        name: employeeData.name,
        employee_id: employeeData.employee_id,
        department: {
          name: departmentData?.name || 'Unknown Department'
        }
      });

      // Calculate date range for selected month/year
      const startDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
      const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];

      console.log("Fetching attendance from", startDate, "to", endDate);

      // Fetch attendance records for the selected month
      const { data: attendanceData, error: attendanceError } = await supabaseAdmin
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (attendanceError) {
        console.error('Error fetching attendance:', attendanceError);
        throw new Error('Failed to load attendance records');
      }

      console.log("Attendance records found:", attendanceData?.length);

      // Transform the data to match our interface
      const transformedData = (attendanceData || []).map(item => ({
        ...item,
        employee: {
          name: employeeData.name,
          employee_id: employeeData.employee_id,
          department: {
            name: departmentData?.name || 'Unknown Department'
          }
        }
      }));

      setAttendanceData(transformedData);
      setFilteredData(transformedData);
      
      // Calculate stats
      const calculatedStats = calculateStats(transformedData);
      setStats(calculatedStats);

    } catch (error) {
      console.error('Error fetching employee attendance:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
      setAttendanceData([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount and when filters change
  useEffect(() => {
    fetchEmployeeAttendance();
  }, [employeeId, selectedMonth, selectedYear]);

  // Filter data based on selected date
  useEffect(() => {
    let filtered = attendanceData;

    // If a specific date is selected, filter by that date
    if (selectedDate) {
      filtered = attendanceData.filter(record => record.date === selectedDate);
    }

    setFilteredData(filtered);
    
    // Recalculate stats for filtered data
    const calculatedStats = calculateStats(filtered);
    setStats(calculatedStats);
  }, [selectedDate, attendanceData]);

  // Reset date filter when month/year changes
  useEffect(() => {
    setSelectedDate('');
  }, [selectedMonth, selectedYear]);

  // Generate month options
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i).toLocaleString('default', { month: 'long' })
  }));

  // Generate year options (last 5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#171717] text-white p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff9d00]"></div>
        <span className="ml-3 text-gray-400">Loading employee data...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#171717] text-white p-6">
      <div className="max-w-7xl mx-auto">

        <SectionHeader title={`${employee?.name} | Attendance`} actions={
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Date Filter */}
            <div className="flex-1">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-black border border-[#333333] rounded-lg px-4 py-2 text-white scheme-dark transition-colors"
                placeholder="Filter by specific date"
              />
            </div>
            
            {/* Month/Year Filters */}
            <div className="flex gap-4">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-black border border-[#333333]  rounded-lg px-4 py-2 text-white transition-colors"
              >
                {monthOptions.map(month => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
              
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-black border border-[#333333]  rounded-lg px-4 py-2 text-white transition-colors"
              >
                {yearOptions.map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>

              <button
                onClick={() => {
                  setSelectedDate('');
                  setSelectedMonth(new Date().getMonth() + 1);
                  setSelectedYear(new Date().getFullYear());
                }}
                className="bg-[#ff9d00] text-black font-medium text-sm hover:bg-[#ff9d00]/90 px-4 py-2 rounded-lg transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        } />
        {/* Header
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Attendance</h1>
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            <span className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              {employee?.name || 'Employee'} | Team
            </span>
          </div>
        </div> */}

        {/* Error Message */}
        {/* {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
            <div className="text-red-400 text-sm">{error}</div>
          </div>
        )} */}

        {/* Attendance Table */}
        <div className="bg-[#111111] rounded-lg border border-[#333333] overflow-hidden mb-6">
          {/* Table Header */}
          <div className="grid grid-cols-8 gap-4 px-6 py-4 bg-[#1a1a1a] border-b border-[#333333] text-sm font-medium text-gray-400">
            <div>Emp ID</div>
            <div>Date</div>
            <div>Department</div>
            <div>Check In</div>
            <div>Check Out</div>
            <div>Hours</div>
            <div>Status</div>
            <div>Percentage</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-[#333333]">
            {filteredData.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {attendanceData.length === 0 
                  ? "No attendance records found for this period" 
                  : "No attendance records match the selected date"}
              </div>
            ) : (
              filteredData.map((record) => (
                <div
                  key={record.id}
                  className="grid grid-cols-8 gap-4 px-6 py-4 hover:bg-[#1a1a1a] transition-colors items-center"
                >
                  {/* Employee ID - With proper text wrapping */}
                  <div className="text-gray-400 text-sm break-all whitespace-normal min-w-0">
                    {record.employee.employee_id}
                  </div>

                  {/* Date */}
                  <div className="text-gray-400 text-sm">
                    {formatDate(record.date)}
                  </div>

                  {/* Department */}
                  <div className="text-gray-400 text-sm">
                    {record.employee.department.name}
                  </div>

                  {/* Check In */}
                  <div className="text-gray-400 text-sm">
                    {formatTime(record.check_in)}
                  </div>

                  {/* Check Out */}
                  <div className="text-gray-400 text-sm">
                    {formatTime(record.check_out)}
                  </div>

                  {/* Hours */}
                  <div className="text-gray-400 text-sm">
                    {formatHours(record.total_hours)}
                  </div>

                  {/* Status */}
                  <div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                        record.status
                      )}`}
                    >
                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                    </span>
                  </div>

                  {/* Percentage - Now shows individual day percentage */}
                  <div className="text-gray-400 text-sm">
                    {record.status === 'present' || record.status === 'late' ? '100%' : '0%'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Attendance Summary */}
        <div className="bg-[#111111] rounded-lg p-6 border border-[#333333]">
          <h2 className="text-xl font-bold text-white mb-4">Attendance Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-gray-400 text-sm mb-2">Month</div>
              <div className="text-2xl font-bold text-white">
                {monthOptions.find(m => m.value === selectedMonth)?.label}
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-400 text-sm mb-2">Year</div>
              <div className="text-2xl font-bold text-white">{selectedYear}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-400 text-sm mb-2">Total Days</div>
              <div className="text-2xl font-bold text-white">{stats.totalDays}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-400 text-sm mb-2">Attendance %</div>
              <div className="text-2xl font-bold text-green-400">
                {stats.attendancePercentage}%
              </div>
            </div>
          </div>
          
          {/* Detailed Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-[#333333]">
            <div className="text-center">
              <div className="text-green-400 text-2xl font-bold">{stats.presentDays}</div>
              <div className="text-gray-400 text-sm">Present Days</div>
            </div>
            <div className="text-center">
              <div className="text-yellow-400 text-2xl font-bold">{stats.lateDays}</div>
              <div className="text-gray-400 text-sm">Late Days</div>
            </div>
            <div className="text-center">
              <div className="text-red-400 text-2xl font-bold">{stats.absentDays}</div>
              <div className="text-gray-400 text-sm">Absent Days</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}