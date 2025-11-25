"use client"
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useUser } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import FilterSelect from '@/Components/FilterSelect';
import DataTable from '@/Components/DataTable';
import SectionHeader from '@/Components/SectionHeader';
import { Button } from '@/Components/ui/button';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface LeaveRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_role: string;
  leave_type: string;
  total_days: number;
  start_date: string;
  end_date: string;
  status: string;
  reason: string;
  department_id: string;
}

interface ManagerData {
  id: string;
  department_id: string;
  department_name: string;
}

interface EmployeeData {
  id: string;
  name: string;
  department_id: string;
  roles: {
    role_name: string;
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
  employees: {
    name: string;
    department_id: string;
  };
}

// Calendar icon component
const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
  </svg>
);

export default function ManagerLeaveRequests() {
    const params = useParams();
    const id = (params.id) as string;
    console.log("The id of manager is : ", id)

    // const user = useUser();

  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<LeaveRequest[]>([]);
  const [managerData, setManagerData] = useState<ManagerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  // Check if any filters are applied
  const hasFilters = searchQuery || typeFilter !== 'all' || statusFilter !== 'all' || dateFilter || monthFilter || yearFilter;

  // Generate months and years for filters
  const months = [
    { value: '', label: 'All Months' },
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

  const leaveTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'Sick Leave', label: 'Sick Leave' },
    { value: 'Casual Leave', label: 'Casual Leave' },
    { value: 'Annual Leave', label: 'Annual Leave' },
    { value: 'Earned Leave', label: 'Earned Leave' },
    { value: 'Maternity Leave', label: 'Maternity Leave' },
    { value: 'Paternity Leave', label: 'Paternity Leave' },
    { value: 'Bereavement Leave', label: 'Bereavement Leave' }
  ];

  const statusTypes = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' }
  ];

  // Fetch manager data and leave requests
  useEffect(() => {
    if (isLoaded) {
      if (user) {
        fetchManagerData();
      } else {
        setError('User not authenticated');
        setLoading(false);
      }
    }
  }, [user, isLoaded]);

  useEffect(() => {
    if (managerData) {
      fetchLeaveRequests();
    }
  }, [managerData]);

  // Apply filters whenever filters or data change
  useEffect(() => {
    applyFilters();
  }, [searchQuery, typeFilter, statusFilter, monthFilter, yearFilter, dateFilter, leaveRequests]);

  const fetchManagerData = async () => {
    if (!user) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);

      // First, get the employee record for the current user
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('id, department_id')
        .eq('id', id)
        // 'temp_1763984661519'
        .single();

      if (employeeError) {
        console.error('Error fetching employee data:', employeeError);
        setError('Employee record not found. Please contact HR.');
        setLoading(false);
        return;
      }

      if (!employeeData) {
        setError('Employee record not found. Please contact HR.');
        setLoading(false);
        return;
      }

      // Then, get the department name using the department_id
      const { data: departmentData, error: departmentError } = await supabase
        .from('departments')
        .select('id, name')
        .eq('id', employeeData.department_id)
        .single();

      if (departmentError) {
        console.error('Error fetching department data:', departmentError);
        setError('Department not found');
        setLoading(false);
        return;
      }

      if (departmentData) {
        setManagerData({
          id: employeeData.id,
          department_id: employeeData.department_id,
          department_name: departmentData.name
        });
      } else {
        setError('Department not found');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching manager data:', error);
      setError('Failed to load manager data');
      setLoading(false);
    }
  };

  const fetchLeaveRequests = async () => {
    if (!managerData) return;

    try {
      setLoading(true);
      setError(null);

      // Get employees in manager's department EXCLUDING the manager themselves
      const { data: departmentEmployees, error: empError } = await supabase
        .from('employees')
        .select(`
          id, 
          name,
          roles (
            role_name
          )
        `)
        .eq('department_id', managerData.department_id)
        .eq('status', 'active')
        .neq('id', managerData.id); // Exclude the manager themselves

      if (empError) {
        console.error('Error fetching department employees:', empError);
        setError('Failed to load department employees');
        setLoading(false);
        return;
      }

      if (!departmentEmployees || departmentEmployees.length === 0) {
        setLeaveRequests([]);
        setLoading(false);
        return;
      }

      const employeeIds = departmentEmployees.map(emp => emp.id);

      // Get leave requests for these employees
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
          employees!leave_requests_employee_id_fkey (
            name,
            department_id
          )
        `)
        .in('employee_id', employeeIds)
        .order('created_at', { ascending: false });

      if (leaveError) {
        console.error('Error fetching leave requests:', leaveError);
        await fetchLeaveRequestsAlternative(employeeIds, departmentEmployees);
        return;
      }

      // Get leave types
      const { data: leaveTypesData, error: typesError } = await supabase
        .from('leave_types')
        .select('id, name');

      if (typesError) {
        console.error('Error fetching leave types:', typesError);
        setError('Failed to load leave types');
        setLoading(false);
        return;
      }

      // Create mappings with proper TypeScript handling
      const leaveTypeMap = new Map();
      leaveTypesData?.forEach(type => {
        leaveTypeMap.set(type.id, type.name);
      });

      const employeeRoleMap = new Map();
      departmentEmployees.forEach(emp => {
        const roleData = emp as unknown as EmployeeData;
        employeeRoleMap.set(roleData.id, roleData.roles?.role_name || 'Employee');
      });

      // Transform data with proper TypeScript handling
      const formattedData: LeaveRequest[] = (leaveData || []).map(request => {
        const leaveRequest = request as unknown as LeaveRequestData;
        return {
          id: leaveRequest.id,
          employee_id: leaveRequest.employee_id,
          employee_name: leaveRequest.employees?.name || 'Unknown Employee',
          employee_role: employeeRoleMap.get(leaveRequest.employee_id) || 'Employee',
          leave_type: leaveTypeMap.get(leaveRequest.leave_type_id) || 'Unknown Type',
          total_days: leaveRequest.total_days,
          start_date: leaveRequest.start_date,
          end_date: leaveRequest.end_date,
          status: leaveRequest.status,
          reason: leaveRequest.reason,
          department_id: leaveRequest.employees?.department_id || managerData.department_id
        };
      });

      setLeaveRequests(formattedData);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      setError('An unexpected error occurred while loading leave requests');
    } finally {
      setLoading(false);
    }
  };

  // Alternative approach if the first one fails
  const fetchLeaveRequestsAlternative = async (employeeIds: string[], departmentEmployees: any[]) => {
    try {
      // Get all leave requests first
      const { data: allLeaveRequests, error: leaveError } = await supabase
        .from('leave_requests')
        .select('*')
        .in('employee_id', employeeIds)
        .order('created_at', { ascending: false });

      if (leaveError) throw leaveError;

      if (!allLeaveRequests || allLeaveRequests.length === 0) {
        setLeaveRequests([]);
        setLoading(false);
        return;
      }

      // Get employee roles separately with proper typing
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select(`
          id, 
          name, 
          department_id,
          roles (role_name)
        `)
        .in('id', employeeIds);

      if (employeesError) throw employeesError;

      // Get leave types
      const { data: leaveTypesData, error: typesError } = await supabase
        .from('leave_types')
        .select('id, name');

      if (typesError) throw typesError;

      // Create mappings with proper TypeScript handling
      const employeeMap = new Map();
      employeesData?.forEach(emp => {
        const employee = emp as unknown as EmployeeData;
        employeeMap.set(employee.id, {
          name: employee.name,
          department_id: employee.department_id,
          role: employee.roles?.role_name || 'Employee'
        });
      });

      const leaveTypeMap = new Map();
      leaveTypesData?.forEach(type => {
        leaveTypeMap.set(type.id, type.name);
      });

      // Transform data manually
      const formattedData: LeaveRequest[] = allLeaveRequests.map(request => {
        const employee = employeeMap.get(request.employee_id);
        return {
          id: request.id,
          employee_id: request.employee_id,
          employee_name: employee?.name || 'Unknown Employee',
          employee_role: employee?.role || 'Employee',
          leave_type: leaveTypeMap.get(request.leave_type_id) || 'Unknown Type',
          total_days: request.total_days,
          start_date: request.start_date,
          end_date: request.end_date,
          status: request.status,
          reason: request.reason,
          department_id: employee?.department_id || managerData?.department_id || ''
        };
      });

      setLeaveRequests(formattedData);
    } catch (error) {
      console.error('Error in alternative leave request fetch:', error);
      setError('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = leaveRequests;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(request =>
        request.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.employee_role.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(request => request.leave_type === typeFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === statusFilter);
    }

    // Enhanced Date filtering - ALWAYS show pending requests regardless of date filters
    const hasMonthFilter = monthFilter !== '';
    const hasYearFilter = yearFilter !== '';
    const hasDateFilter = dateFilter !== '';

    if (hasMonthFilter || hasYearFilter || hasDateFilter) {
      filtered = filtered.filter(request => {
        // Always show pending requests regardless of date filters
        if (request.status === 'pending') {
          return true;
        }

        const requestStartDate = new Date(request.start_date);
        const requestEndDate = new Date(request.end_date);

        // Date filter (specific day)
        if (hasDateFilter) {
          const filterDate = new Date(dateFilter);
          return requestStartDate <= filterDate && requestEndDate >= filterDate;
        }

        // Month and Year filter
        if (hasMonthFilter && hasYearFilter) {
          const requestMonth = String(requestStartDate.getMonth() + 1).padStart(2, '0');
          const requestYear = requestStartDate.getFullYear().toString();
          return requestMonth === monthFilter && requestYear === yearFilter;
        }

        // Year only filter
        if (hasYearFilter && !hasMonthFilter) {
          const requestYear = requestStartDate.getFullYear().toString();
          return requestYear === yearFilter;
        }

        // Month only filter (current year assumed)
        if (hasMonthFilter && !hasYearFilter) {
          const requestMonth = String(requestStartDate.getMonth() + 1).padStart(2, '0');
          return requestMonth === monthFilter;
        }

        return true;
      });
    }

    setFilteredRequests(filtered);
  };

  const handleViewEmployee = (row: any) => {
    if (managerData) {
      router.push(`/manager/${managerData.id}/leaves/${row.employee_id}`);
    }
  };

  const handleApprove = async (requestId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setError(null);
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      // Refresh data
      fetchLeaveRequests();
    } catch (error) {
      console.error('Error approving leave request:', error);
      setError('Failed to approve leave request');
    }
  };

  const handleReject = async (requestId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setError(null);
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      // Refresh data
      fetchLeaveRequests();
    } catch (error) {
      console.error('Error rejecting leave request:', error);
      setError('Failed to reject leave request');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500/20 text-green-400';
      case 'rejected': return 'bg-red-500/20 text-red-400';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Department Manager': return 'bg-purple-500/20 text-purple-400';
      case 'HR Manager': return 'bg-blue-500/20 text-blue-400';
      case 'Employee': return 'bg-gray-500/20 text-gray-400';
      default: return 'bg-gray-400/20 text-gray-400';
    }
  };

  // Table columns configuration
  const columns = [
    {
      key: 'employee_name',
      label: 'Employee',
      sortable: true
    },
    {
      key: 'employee_role',
      label: 'Role',
      sortable: true,
      render: (value: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(value)}`}>
          {value}
        </span>
      )
    },
    {
      key: 'leave_type',
      label: 'Type',
      sortable: true
    },
    {
      key: 'total_days',
      label: 'Days',
      sortable: true,
      render: (value: number) => (
        <span className="text-center block">{value}</span>
      )
    },
    {
      key: 'start_date',
      label: 'From',
      sortable: true,
      render: (value: string) => formatDate(value)
    },
    {
      key: 'end_date',
      label: 'To',
      sortable: true,
      render: (value: string) => formatDate(value)
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(value)}`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      )
    },
    {
      key: 'reason',
      label: 'Reason',
      render: (value: string) => (
        <span title={value} className="max-w-xs wrap-break-word">
          {value.length > 30 ? `${value.substring(0, 30)}...` : value}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value: any, row: any) => (
        <div className="flex space-x-2">
          {row.status === 'pending' && (
            <>
              <button
                onClick={(e) => handleApprove(row.id, e)}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                Approve
              </button>
              <button
                onClick={(e) => handleReject(row.id, e)}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                Reject
              </button>
            </>
          )}
          <button
            className="text-[#ff9d00] cursor-pointer font-medium text-sm hover:text-[#ff9d00]/90 px-3 py-1 rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleViewEmployee(row);
            }}
          >
            View
          </button>
        </div>
      )
    }
  ];

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setStatusFilter('all');
    setDateFilter('');
    setMonthFilter('');
    setYearFilter('');
  };

  // Actions for the SectionHeader
  const actions = (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center w-full sm:w-auto">
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-40 p-2 pl-9 rounded-lg bg-black border border-[#333333] text-white text-sm focus:ring-2"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Date Filter with Calendar Icon */}
      <div className="relative w-full sm:w-40">
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-full p-2 rounded-lg bg-black border border-[#333333] text-white text-sm scheme:dark"
        />
      </div>

      {/* Month Filter */}
      <div className="w-full sm:w-36">
        <FilterSelect
          options={months}
          value={monthFilter}
          onChange={setMonthFilter}
          placeholder="Month"
          icon={<CalendarIcon />}
        />
      </div>

      {/* Year Filter - Number Input */}
      <input
        type="number"
        placeholder="Year"
        value={yearFilter}
        onChange={(e) => setYearFilter(e.target.value)}
        min="2020"
        max="2030"
        className="w-full sm:w-24 p-2 rounded-lg bg-black border border-[#333333] text-white text-sm"
      />

      {/* Leave Type Filter */}
      <div className="w-full sm:w-36">
        <FilterSelect
          options={leaveTypes}
          value={typeFilter}
          onChange={setTypeFilter}
          placeholder="Leave Type"
        />
      </div>

      {/* Status Filter */}
      <div className="w-full sm:w-36">
        <FilterSelect
          options={statusTypes}
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="Status"
        />
      </div>

      {/* Clear Button - Only show when filters are applied */}
      {hasFilters && (
        <Button
          onClick={handleResetFilters}
          className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#ff9d00] text-black font-medium text-sm hover:bg-[#ff9d00]/90 transition-colors"
        >
          Clear
        </Button>
      )}
    </div>
  );

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#171717] flex items-center justify-center">
        <div className="text-white text-lg">Loading leave requests...</div>
      </div>
    );
  }

  // Show error state
  if (error && !managerData) {
    return (
      <div className="min-h-screen bg-[#171717] flex items-center justify-center">
        <div className="text-red-400 text-lg text-center max-w-md">
          <div className="mb-4">Error: {error}</div>
          <button
            onClick={fetchManagerData}
            className="bg-[#ff9d00] hover:bg-[#e68e00] text-black px-4 py-2 rounded-md transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#171717] text-white p-6">
      <div className="max-w-7xl mx-auto">

        {/* Leave Requests Section */}
        <section className="mb-8">
          <SectionHeader
            title="Leave Requests"
            description={`Managing department: ${managerData?.department_name || 'Loading...'}`}
            actions={actions}
          />

          {error && (
            <div className="mb-6 p-3 bg-red-900/50 border border-red-700 rounded-md text-red-300">
              {error}
              <button
                onClick={() => setError(null)}
                className="ml-4 text-red-100 hover:text-white"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Data Table */}
          <DataTable
            columns={columns}
            data={filteredRequests}
            loading={loading}
            emptyMessage={
              leaveRequests.length === 0 ?
                'No leave requests found in your department' :
                'No leave requests match your filters'
            }
            onRowClick={handleViewEmployee}
          />

          {/* Summary Stats */}
          <div className="mt-4 text-sm text-gray-400">
            Showing {filteredRequests.length} of {leaveRequests.length} leave requests
            {managerData && ` in ${managerData.department_name} department`}
          </div>
        </section>
      </div>
    </div>
  );
}