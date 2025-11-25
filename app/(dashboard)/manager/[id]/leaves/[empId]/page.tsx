"use client"
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams } from 'next/navigation';
import FilterSelect from '@/Components/FilterSelect';
import DataTable from '@/Components/DataTable';
import SectionHeader from '@/Components/SectionHeader';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface LeaveRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  leave_type: string;
  total_days: number;
  start_date: string;
  end_date: string;
  status: string;
  reason: string;
  department_id: string;
  department_name: string;
  created_at: string;
  percentage: number;
}

interface EmployeeDetails {
  id: string;
  name: string;
  email: string;
  employee_id: string;
  department_name: string;
}

interface EmployeeData {
  id: string;
  name: string;
  email: string;
  employee_id: string;
  department_id: string;
  departments: {
    name: string;
  };
}

interface LeaveRequestData {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: string;
  reason: string;
  created_at: string;
  employees: {
    name: string;
    department_id: string;
    departments: {
      name: string;
    };
  };
}

export default function EmployeeLeavesPage() {
  const params = useParams();
  const managerId = params.id as string;
  const employeeId = params.empId as string;

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [employeeDetails, setEmployeeDetails] = useState<EmployeeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');

  // Filter options
  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'Sick Leave', label: 'Sick Leave' },
    { value: 'Casual Leave', label: 'Casual Leave' },
    { value: 'Annual Leave', label: 'Annual Leave' },
    { value: 'Earned Leave', label: 'Earned Leave' },
    { value: 'Maternity Leave', label: 'Maternity Leave' },
    { value: 'Paternity Leave', label: 'Paternity Leave' },
    { value: 'Bereavement Leave', label: 'Bereavement Leave' }
  ];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' }
  ];

  const monthOptions = [
    { value: 'all', label: 'All Months' },
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  // Generate year options (from 2020 to current year + 1)
  const currentYear = new Date().getFullYear();
  const yearOptions = [
    { value: 'all', label: 'All Years' },
    ...Array.from({ length: currentYear - 2019 + 1 }, (_, i) => {
      const year = currentYear - i;
      return { value: year.toString(), label: year.toString() };
    })
  ];

  useEffect(() => {
    fetchEmployeeDetails();
    fetchEmployeeLeaves();
  }, [employeeId]);

  // Update month and year filters when date filter changes
  useEffect(() => {
    if (dateFilter) {
      const date = new Date(dateFilter);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear().toString();

      setMonthFilter(month);
      setYearFilter(year);
    }
  }, [dateFilter]);

  const fetchEmployeeDetails = async () => {
    try {
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select(`
          id,
          name,
          email,
          employee_id,
          department_id,
          departments!employees_department_id_fkey (
            name
          )
        `)
        .eq('id', employeeId)
        .single();

      if (employeeError) throw employeeError;

      if (employeeData) {
        // Fix TypeScript issues by properly accessing the nested data
        const employee = employeeData as unknown as EmployeeData;
        setEmployeeDetails({
          id: employee.id,
          name: employee.name,
          email: employee.email,
          employee_id: employee.employee_id,
          department_name: employee.departments?.name || 'No Department'
        });
      }
    } catch (error) {
      console.error('Error fetching employee details:', error);
      setError('Failed to load employee details');
    }
  };

  const fetchEmployeeLeaves = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get leave requests for this employee with correct relationship specification
      const { data: leaveData, error: leaveError } = await supabase
        .from('leave_requests')
        .select(`
          id,
          employee_id,
          leave_type_id,
          start_date,
          end_date,
          total_days,
          status,
          reason,
          created_at,
          employees!leave_requests_employee_id_fkey (
            name,
            department_id,
            departments!employees_department_id_fkey (
              name
            )
          )
        `)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (leaveError) throw leaveError;

      // Get leave types
      const { data: leaveTypes, error: typesError } = await supabase
        .from('leave_types')
        .select('id, name');

      if (typesError) throw typesError;

      // Create a mapping of leave_type_id to leave type name
      const leaveTypeMap = new Map();
      leaveTypes?.forEach(type => {
        leaveTypeMap.set(type.id, type.name);
      });

      // Transform data and calculate percentages with proper TypeScript typing
      const formattedData: LeaveRequest[] = (leaveData || []).map(request => {
        const leaveRequest = request as unknown as LeaveRequestData;
        const totalDays = leaveRequest.total_days;
        const percentage = (totalDays / 22) * 100; // 22 working days in a month

        return {
          id: leaveRequest.id,
          employee_id: leaveRequest.employee_id,
          employee_name: leaveRequest.employees?.name || 'Unknown',
          leave_type: leaveTypeMap.get(leaveRequest.leave_type_id) || 'Unknown Type',
          total_days: totalDays,
          start_date: leaveRequest.start_date,
          end_date: leaveRequest.end_date,
          status: leaveRequest.status,
          reason: leaveRequest.reason,
          department_id: leaveRequest.employees?.department_id || '',
          department_name: leaveRequest.employees?.departments?.name || 'No Department',
          created_at: leaveRequest.created_at,
          percentage: Math.min(percentage, 100) // Cap at 100%
        };
      });

      setLeaveRequests(formattedData);
    } catch (error) {
      console.error('Error fetching employee leaves:', error);
      setError('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  // Calculate overall percentage based on current filters
  const calculateOverallPercentage = () => {
    const filteredLeaves = applyFilters(leaveRequests);
    const totalLeaveDays = filteredLeaves.reduce((total, request) => total + request.total_days, 0);

    // Assuming 22 working days in a month
    const workingDaysInMonth = 22;
    const percentage = (totalLeaveDays / workingDaysInMonth) * 100;

    return Math.min(percentage, 100);
  };

  // Apply all filters to the data
  const applyFilters = (data: LeaveRequest[]) => {
    return data.filter(request => {
      const requestDate = new Date(request.start_date);
      const requestMonth = String(requestDate.getMonth() + 1).padStart(2, '0');
      const requestYear = requestDate.getFullYear().toString();

      // Type filter
      if (typeFilter !== 'all' && request.leave_type !== typeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && request.status !== statusFilter) {
        return false;
      }

      // Date filter (exact date match)
      if (dateFilter) {
        const filterDate = new Date(dateFilter).toDateString();
        const requestStartDate = new Date(request.start_date).toDateString();
        const requestEndDate = new Date(request.end_date).toDateString();

        // Check if the filter date falls within the leave period
        if (filterDate !== requestStartDate && filterDate !== requestEndDate) {
          return false;
        }
      }

      // Month filter
      if (monthFilter !== 'all' && requestMonth !== monthFilter) {
        return false;
      }

      // Year filter
      if (yearFilter !== 'all' && requestYear !== yearFilter) {
        return false;
      }

      return true;
    });
  };

  const filteredRequests = applyFilters(leaveRequests);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'rejected':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getPercentageColor = (percentage: number) => {
    if (percentage <= 25) return 'text-green-400';
    if (percentage <= 50) return 'text-yellow-400';
    if (percentage <= 75) return 'text-orange-400';
    return 'text-red-400';
  };

  const clearFilters = () => {
    setTypeFilter('all');
    setStatusFilter('all');
    setDateFilter('');
    setMonthFilter('all');
    setYearFilter('all');
  };

  // Get current filter description
  const getFilterDescription = () => {
    const filters = [];

    if (dateFilter) {
      filters.push(`Date: ${formatDate(dateFilter)}`);
    }

    if (monthFilter !== 'all') {
      const monthName = monthOptions.find(m => m.value === monthFilter)?.label;
      filters.push(`Month: ${monthName}`);
    }

    if (yearFilter !== 'all') {
      filters.push(`Year: ${yearFilter}`);
    }

    if (typeFilter !== 'all') {
      filters.push(`Type: ${typeFilter}`);
    }

    if (statusFilter !== 'all') {
      filters.push(`Status: ${statusFilter}`);
    }

    return filters.length > 0 ? `Filtered by: ${filters.join(', ')}` : 'Showing all leaves';
  };

  // Table columns
  const columns = [
    {
      key: 'employee_name',
      label: 'Employee Name',
      sortable: true
    },
    {
      key: 'date_range',
      label: 'Date',
      sortable: true,
      render: (value: any, row: LeaveRequest) => (
        <span>{formatDate(row.start_date)} - {formatDate(row.end_date)}</span>
      )
    },
    {
      key: 'department_name',
      label: 'Department',
      sortable: true
    },
    {
      key: 'leave_type',
      label: 'Leave Type',
      sortable: true
    },
    {
      key: 'total_days',
      label: 'Days',
      sortable: true,
      render: (value: number) => (
        <span className="text-center">{value} days</span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string) => (
        <span className={`px-2 py-1 rounded-full text-xs border ${getStatusBadgeColor(value)}`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      )
    },
    {
      key: 'percentage',
      label: 'Percentage',
      sortable: true,
      render: (value: number) => (
        <span className={`font-medium ${getPercentageColor(value)}`}>
          {value.toFixed(1)}%
        </span>
      )
    },
    {
      key: 'reason',
      label: 'Reason',
      render: (value: string) => (
        <span title={value} className="max-w-xs wrap-break-word">
          {value || 'Not specified'}
        </span>
      )
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#171717] flex items-center justify-center">
        <div className="text-white text-lg">Loading employee leaves...</div>
      </div>
    );
  }

  const overallPercentage = calculateOverallPercentage();

  return (
    <div className="min-h-screen bg-[#171717] text-white p-6">
      {/* Header with SectionHeader component */}
      <SectionHeader
        title={`${employeeDetails?.name || 'Employee'} | Leaves`}
        description={`Employee ID: ${employeeDetails?.employee_id}  | Department: ${employeeDetails?.department_name}  |  Leave Percentage: ${overallPercentage.toFixed(1)}%`}
        //   <div className="text-gray-400 mt-2">
        //     <div className="flex flex-wrap items-center gap-4 mb-2">
        //       <span>Employee ID: {employeeDetails?.employee_id}</span>
        //       <span>Department: {employeeDetails?.department_name}</span>
        //       <span className={`font-medium ${getPercentageColor(overallPercentage)}`}>
        //         Leave Percentage: {overallPercentage.toFixed(1)}%
        //       </span>
        //     </div>
        //     <div className="text-sm text-gray-500">
        //       {getFilterDescription()}
        //     </div>
        //   </div>
        // }
        actions={
          <div className='flex gap-3 justify-center items-center'>
              {/* Date Filter */}
              <div>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full bg-black border border-[#333333] rounded-lg px-3 py-2 text-white scheme-dark"
                />
              </div>

              {/* Month Filter */}
              <div>
                <FilterSelect
                  options={monthOptions}
                  value={monthFilter}
                  onChange={setMonthFilter}
                  placeholder="Select month..."
                />
              </div>

              {/* Year Filter */}
              <div>
                <FilterSelect
                  options={yearOptions}
                  value={yearFilter}
                  onChange={setYearFilter}
                  placeholder="Select year..."
                />
              </div>

              {/* Type Filter */}
              <div>
                <FilterSelect
                  options={typeOptions}
                  value={typeFilter}
                  onChange={setTypeFilter}
                  placeholder="Select type..."
                />
              </div>

              {/* Status Filter */}
              <div>
                <FilterSelect
                  options={statusOptions}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  placeholder="Select status..."
                />
              </div>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-[#ff9d00] rounded-lg text-black hover:bg-[#ff9d00]/90 transition-colors text-sm "
            >
              Clear
            </button>
          </div>
        }
      />

      {/* Data Table using DataTable component */}
      <DataTable
        columns={columns}
        data={filteredRequests}
        loading={loading}
        emptyMessage={leaveRequests.length === 0 ? 'No leave records found' : 'No leaves match your filters'}
        className="mb-6"
      />

      {/* Summary Stats */}
      <div className="text-sm text-gray-400">
        Showing {filteredRequests.length} of {leaveRequests.length} leave requests
      </div>
    </div>
  );
}