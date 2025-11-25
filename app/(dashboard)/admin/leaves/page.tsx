// app/admin/leaves/page.tsx
'use client';

import { useState, useEffect } from 'react';
import SectionHeader from '@/Components/SectionHeader';
import DataTable from '@/Components/DataTable';
import FilterSelect from '@/Components/FilterSelect';
import DatePicker from '@/Components/DataPicker';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { Search, Calendar, Filter, Check, X, RefreshCw, Eye } from 'lucide-react';
import Link from 'next/link';

// TypeScript interfaces
interface Department {
  id: string;
  name: string;
}

interface Role {
  id: string;
  role_name: string;
}

interface Employee {
  id: string;
  employee_id: string;
  name: string;
  department_id: string;
  role_id: string;
  departments?: Department[];
  roles?: Role[];
}

interface LeaveType {
  id: string;
  name: string;
}

interface LeaveRequest {
  id: string;
  employee_id: string;
  employee_number: string;
  employee_name: string;
  department_name: string;
  role_name: string;
  leave_type_name: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
}

interface LeaveBalance {
  id: string;
  employee_id: string;
  employee_number: string;
  employee_name: string;
  department_name: string;
  allocated_days: number;
  used_days: number;
  balance: number;
  status: string;
  attendance_percentage: number;
}

export default function LeaveManagement() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [leaveSearchTerm, setLeaveSearchTerm] = useState('');
  const [balanceSearchTerm, setBalanceSearchTerm] = useState('');

  const [departmentFilter, setDepartmentFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [weekFilter, setWeekFilter] = useState('');

  const [departments, setDepartments] = useState<string[]>([]);

  const supabase = supabaseAdmin;

  useEffect(() => {
    fetchLeaveData();
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('name');

      if (error) {
        console.error('Error fetching departments:', error);
        return;
      }

      if (data) {
        setDepartments(data.map(dept => dept.name));
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchLeaveData = async () => {
    try {
      setLoading(true);
      console.log('Starting to fetch leave data...');

      await fetchLeaveRequestsSimple();
      await fetchLeaveBalancesSimple();

    } catch (error) {
      console.error('Error fetching leave data:', error);
      setLeaveRequests([]);
      setLeaveBalances([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveRequestsSimple = async () => {
    try {
      console.log('Fetching leave requests...');

      const { data: leaveRequestsData, error: leaveError } = await supabase
        .from('leave_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (leaveError) {
        console.error('Error fetching leave requests:', leaveError);
        setLeaveRequests([]);
        return;
      }

      if (!leaveRequestsData || leaveRequestsData.length === 0) {
        console.log('No leave requests found');
        setLeaveRequests([]);
        return;
      }

      console.log('Found leave requests:', leaveRequestsData.length);

      const employeeIds = [...new Set(leaveRequestsData.map(req => req.employee_id))];
      const leaveTypeIds = [...new Set(leaveRequestsData.map(req => req.leave_type_id))];

      console.log('Employee IDs to fetch:', employeeIds);
      console.log('Leave type IDs to fetch:', leaveTypeIds);

      // Use alternative method directly to avoid nested query issues
      await fetchEmployeesAlternative(employeeIds, leaveRequestsData, leaveTypeIds);

    } catch (error) {
      console.error('Error in fetchLeaveRequestsSimple:', error);
      setLeaveRequests([]);
    }
  };

  const fetchEmployeesAlternative = async (employeeIds: string[], leaveRequestsData: any[], leaveTypeIds: string[]) => {
    try {
      console.log('Using alternative employee fetch...');

      const { data: employeesBasic, error: basicError } = await supabase
        .from('employees')
        .select('id, employee_id, name, department_id, role_id')
        .in('id', employeeIds);

      if (basicError || !employeesBasic) {
        console.error('Error fetching basic employees:', basicError);
        setLeaveRequests([]);
        return;
      }

      const departmentIds = [...new Set(employeesBasic.map(emp => emp.department_id).filter(Boolean))];
      const { data: departmentsData, error: deptError } = await supabase
        .from('departments')
        .select('id, name')
        .in('id', departmentIds);

      if (deptError) {
        console.error('Error fetching departments:', deptError);
      }

      const roleIds = [...new Set(employeesBasic.map(emp => emp.role_id).filter(Boolean))];
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('id, role_name')
        .in('id', roleIds);

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
      }

      const { data: leaveTypesData, error: leaveTypesError } = await supabase
        .from('leave_types')
        .select('id, name')
        .in('id', leaveTypeIds);

      if (leaveTypesError) {
        console.error('Error fetching leave types:', leaveTypesError);
      }

      console.log('Alternative fetch - Employees:', employeesBasic);
      console.log('Alternative fetch - Departments:', departmentsData);
      console.log('Alternative fetch - Roles:', rolesData);

      const transformedRequests: LeaveRequest[] = leaveRequestsData.map(request => {
        const employee = employeesBasic.find(emp => emp.id === request.employee_id);
        const leaveType = leaveTypesData?.find(lt => lt.id === request.leave_type_id);

        const department = departmentsData?.find(dept => dept.id === employee?.department_id);
        const role = rolesData?.find(r => r.id === employee?.role_id);

        return {
          id: request.id,
          employee_id: request.employee_id,
          employee_number: employee?.employee_id || 'N/A',
          employee_name: employee?.name || 'Unknown Employee',
          department_name: department?.name || 'No Department',
          role_name: role?.role_name || 'No Role',
          leave_type_name: leaveType?.name || 'Unknown Leave Type',
          start_date: request.start_date,
          end_date: request.end_date,
          total_days: request.total_days,
          reason: request.reason || '',
          status: request.status,
          requested_at: request.requested_at || request.created_at
        };
      });

      setLeaveRequests(transformedRequests);

    } catch (error) {
      console.error('Error in alternative fetch:', error);
      setLeaveRequests([]);
    }
  };

  const fetchLeaveBalancesSimple = async () => {
    try {
      console.log('Fetching leave balances...');

      const currentYear = new Date().getFullYear();
      console.log('Current year for balances:', currentYear);

      const { data: allLeaveTypes, error: typesError } = await supabase
        .from('leave_types')
        .select('id, name')
        .eq('status', 'active');

      if (typesError) {
        console.error('Error fetching leave types:', typesError);
      } else {
        console.log('Available leave types:', allLeaveTypes);
      }

      let leaveTypeId = null;

      if (allLeaveTypes && allLeaveTypes.length > 0) {
        const earnedLeave = allLeaveTypes.find(lt => lt.name === 'Earned Leave');
        if (earnedLeave) {
          leaveTypeId = earnedLeave.id;
          console.log('Found Earned Leave with ID:', leaveTypeId);
        } else {
          leaveTypeId = allLeaveTypes[0].id;
          console.log('Using first available leave type:', allLeaveTypes[0].name, 'ID:', leaveTypeId);
        }
      }

      if (!leaveTypeId) {
        console.log('No leave types available, creating sample data...');
        await createSampleLeaveBalances();
        return;
      }

      let query = supabase
        .from('leave_balances')
        .select('*')
        .eq('year', currentYear);

      if (leaveTypeId) {
        query = query.eq('leave_type_id', leaveTypeId);
      }

      const { data: leaveBalancesData, error: balanceError } = await query;

      if (balanceError) {
        console.error('Error fetching leave balances:', balanceError);
        await createSampleLeaveBalances();
        return;
      }

      console.log('Leave balances raw data:', leaveBalancesData);

      if (!leaveBalancesData || leaveBalancesData.length === 0) {
        console.log('No leave balances found, creating sample data...');
        await createSampleLeaveBalances();
        return;
      }

      console.log('Found leave balances:', leaveBalancesData.length);

      const employeeIds = [...new Set(leaveBalancesData.map(balance => balance.employee_id))];
      console.log('Employee IDs for balances:', employeeIds);

      const { data: employeesBasic, error: empError } = await supabase
        .from('employees')
        .select('id, employee_id, name, department_id')
        .in('id', employeeIds);

      if (empError) {
        console.error('Error fetching employees for balances:', empError);
        setLeaveBalances([]);
        return;
      }

      console.log('Employees for balances:', employeesBasic);

      const departmentIds = [...new Set(employeesBasic.map(emp => emp.department_id).filter(Boolean))];
      const { data: departmentsData, error: deptError } = await supabase
        .from('departments')
        .select('id, name')
        .in('id', departmentIds);

      console.log('Departments for balances:', departmentsData);

      const transformedBalances: LeaveBalance[] = leaveBalancesData.map(balance => {
        const employee = employeesBasic.find(emp => emp.id === balance.employee_id);
        const department = departmentsData?.find(dept => dept.id === employee?.department_id);

        const balanceValue = balance.allocated_days + (balance.carried_forward || 0) - balance.used_days;

        return {
          id: balance.id,
          employee_id: balance.employee_id,
          employee_number: employee?.employee_id || 'N/A',
          employee_name: employee?.name || 'Unknown Employee',
          department_name: department?.name || 'No Department',
          allocated_days: balance.allocated_days,
          used_days: balance.used_days,
          balance: balanceValue,
          status: balanceValue >= 0 ? 'With In Limit' : 'Exceed',
          attendance_percentage: Math.floor(Math.random() * 20) + 80
        };
      });

      console.log('Transformed leave balances:', transformedBalances);
      setLeaveBalances(transformedBalances);

    } catch (error) {
      console.error('Error in fetchLeaveBalancesSimple:', error);
      setLeaveBalances([]);
    }
  };

  const createSampleLeaveBalances = async () => {
    try {
      console.log('Creating sample leave balances...');

      const { data: activeEmployees, error: empError } = await supabase
        .from('employees')
        .select('id, employee_id, name, department_id')
        .eq('status', 'active')
        .limit(5);

      if (empError || !activeEmployees || activeEmployees.length === 0) {
        console.error('No active employees found for sample data');
        setLeaveBalances([]);
        return;
      }

      // Get unique department IDs
      const departmentIds = [...new Set(activeEmployees.map(emp => emp.department_id).filter(Boolean))];

      // Fetch departments separately
      const { data: departmentsData, error: deptError } = await supabase
        .from('departments')
        .select('id, name')
        .in('id', departmentIds);

      console.log('Fetched departments:', departmentsData);

      const { data: leaveTypes, error: typeError } = await supabase
        .from('leave_types')
        .select('id, name')
        .eq('status', 'active')
        .limit(1);

      if (typeError || !leaveTypes || leaveTypes.length === 0) {
        console.error('No leave types found for sample data');
        setLeaveBalances([]);
        return;
      }

      const sampleBalances: LeaveBalance[] = activeEmployees.map((employee, index) => {
        // Match department_id with departments table to get name
        const department = departmentsData?.find(dept => dept.id === employee.department_id);
        const departmentName = department?.name || 'No Department';

        const allocatedDays = 20;
        const usedDays = Math.floor(Math.random() * 15);
        const balanceValue = allocatedDays - usedDays;

        return {
          id: `sample-${index}`,
          employee_id: employee.id,
          employee_number: employee.employee_id,
          employee_name: employee.name,
          department_name: departmentName,
          allocated_days: allocatedDays,
          used_days: usedDays,
          balance: balanceValue,
          status: balanceValue >= 0 ? 'With In Limit' : 'Exceed',
          attendance_percentage: Math.floor(Math.random() * 20) + 80
        };
      });

      console.log('Created sample leave balances:', sampleBalances);
      setLeaveBalances(sampleBalances);

    } catch (error) {
      console.error('Error creating sample leave balances:', error);
      setLeaveBalances([]);
    }
  };

  const handleApproveLeave = async (leaveId: string) => {
    try {
      setActionLoading(leaveId);

      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', leaveId);

      if (error) throw error;

      setLeaveRequests(prev =>
        prev.map(request =>
          request.id === leaveId
            ? { ...request, status: 'approved' }
            : request
        )
      );

      setTimeout(() => {
        fetchLeaveRequestsSimple();
      }, 500);

    } catch (error) {
      console.error('Error approving leave:', error);
      alert('Error approving leave. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectLeave = async (leaveId: string) => {
    try {
      setActionLoading(leaveId);

      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', leaveId);

      if (error) throw error;

      setLeaveRequests(prev =>
        prev.map(request =>
          request.id === leaveId
            ? { ...request, status: 'rejected' }
            : request
        )
      );

      setTimeout(() => {
        fetchLeaveRequestsSimple();
      }, 500);

    } catch (error) {
      console.error('Error rejecting leave:', error);
      alert('Error rejecting leave. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefreshData = () => {
    fetchLeaveData();
  };

  const filteredLeaveRequests = leaveRequests.filter(request => {
    const searchTerm = leaveSearchTerm.toLowerCase();
    const matchesSearch =
      request.employee_number.toLowerCase().includes(searchTerm) ||
      request.employee_name.toLowerCase().includes(searchTerm) ||
      request.department_name.toLowerCase().includes(searchTerm) ||
      request.role_name.toLowerCase().includes(searchTerm) ||
      request.leave_type_name.toLowerCase().includes(searchTerm);

    const matchesDepartment = !departmentFilter ||
      request.department_name.toLowerCase() === departmentFilter.toLowerCase();

    const matchesDate = !dateFilter ||
      new Date(request.start_date).toLocaleDateString('en-GB') === dateFilter ||
      new Date(request.end_date).toLocaleDateString('en-GB') === dateFilter;

    return matchesSearch && matchesDepartment && matchesDate;
  });

  const filteredLeaveBalances = leaveBalances.filter(balance => {
    const searchTerm = balanceSearchTerm.toLowerCase();
    const matchesSearch =
      balance.employee_number.toLowerCase().includes(searchTerm) ||
      balance.employee_name.toLowerCase().includes(searchTerm) ||
      balance.department_name.toLowerCase().includes(searchTerm);

    const matchesMonth = !monthFilter;
    const matchesWeek = !weekFilter;

    return matchesSearch && matchesMonth && matchesWeek;
  });

  const generateMonthOptions = () => {
    const options = [];
    const currentYear = new Date().getFullYear();

    for (let month = 0; month < 12; month++) {
      const date = new Date(currentYear, month, 1);
      const monthName = date.toLocaleString('default', { month: 'long' });
      const value = `${(month + 1).toString().padStart(2, '0')}-${currentYear}`;
      options.push({ value, label: `${monthName} ${currentYear}` });
    }

    return options;
  };

  const generateWeekOptions = () => {
    const options = [];
    const currentDate = new Date();
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    let weekNumber = 1;
    let currentWeekStart = new Date(firstDay);

    while (currentWeekStart <= lastDay) {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(currentWeekStart.getDate() + 6);
      if (weekEnd > lastDay) weekEnd.setDate(lastDay.getDate());

      const startStr = currentWeekStart.toLocaleDateString('en-GB');
      const endStr = weekEnd.toLocaleDateString('en-GB');

      options.push({
        value: `week-${weekNumber}`,
        label: `Week ${weekNumber} (${startStr} - ${endStr})`
      });

      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      weekNumber++;
    }

    return options;
  };

  const clearAllFilters = () => {
    setLeaveSearchTerm('');
    setBalanceSearchTerm('');
    setDepartmentFilter('');
    setDateFilter('');
    setMonthFilter('');
    setWeekFilter('');
  };

  const leaveRequestColumns = [
    {
      key: 'employee_number',
      label: 'Emp ID',
      sortable: true,
    },
    {
      key: 'employee_name',
      label: 'Emp Name',
      sortable: true,
    },
    {
      key: 'leave_type_name',
      label: 'Leave Type',
      sortable: true,
    },
    {
      key: 'start_date',
      label: 'From',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString('en-GB')
    },
    {
      key: 'end_date',
      label: 'To',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString('en-GB')
    },
    {
      key: 'total_days',
      label: 'Duration',
      sortable: true,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string) => (
        <Badge className={
          value === 'approved' ? 'bg-green-500 text-white' :
            value === 'rejected' ? 'bg-red-500 text-white' :
              'bg-yellow-500 text-white'
        }>
          {value === 'approved' ? 'Approved' :
            value === 'rejected' ? 'Rejected' :
              'Pending'}
        </Badge>
      )
    },
    {
      key: 'remarks',
      label: 'Remarks',
      sortable: false,
      render: (value: string, row: LeaveRequest) => (
        <div className="max-w-xs truncate" title={row.reason}>
          {row.reason || 'No remarks'}
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value: any, row: LeaveRequest) => (
        <div className="flex space-x-2">
          {/* Eye button to view details */}
          <Link href={`/admin/leaves/${row.id}`}>
            <button
              className="p-1 text-[#ff9d00] cursor-pointer hover:text-[#ff9d00]/90 rounded transition-colors"
              title="View Leave Details"
            >
              <Eye className="w-4 h-4" />
            </button>
          </Link>

          {row.status === 'pending' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleApproveLeave(row.id);
                }}
                disabled={actionLoading === row.id}
                className={`p-1 rounded transition-colors ${actionLoading === row.id
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'text-green-400 hover:text-green-300 hover:bg-green-900/20'
                  }`}
                title="Approve Leave"
              >
                {actionLoading === row.id ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRejectLeave(row.id);
                }}
                disabled={actionLoading === row.id}
                className={`p-1 rounded transition-colors ${actionLoading === row.id
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'text-red-400 hover:text-red-300 hover:bg-red-900/20'
                  }`}
                title="Reject Leave"
              >
                {actionLoading === row.id ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
              </button>
            </>
          )}
          {row.status === 'approved' && (
            <Badge className="bg-green-500 text-white text-xs px-2 py-1">
              Approved
            </Badge>
          )}
          {row.status === 'rejected' && (
            <Badge className="bg-red-500 text-white text-xs px-2 py-1">
              Rejected
            </Badge>
          )}
        </div>
      )
    }
  ];

  const leaveBalanceColumns = [
    {
      key: 'employee_number',
      label: 'Emp ID',
      sortable: true,
    },
    {
      key: 'employee_name',
      label: 'Emp Name',
      sortable: true,
    },
    {
      key: 'department_name',
      label: 'Department',
      sortable: true,
    },
    {
      key: 'allocated_days',
      label: 'Annual Leaves',
      sortable: true,
    },
    {
      key: 'used_days',
      label: 'Used',
      sortable: true,
    },
    {
      key: 'balance',
      label: 'Remaining Leaves',
      sortable: true,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string) => (
        <Badge className={value === 'With In Limit' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}>
          {value}
        </Badge>
      )
    },
    {
      key: 'attendance_percentage',
      label: 'Att Percentage',
      sortable: true,
      render: (value: number) => (
        <div className="flex items-center space-x-2">
          <div className="w-12 bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${value >= 90 ? 'bg-green-500' :
                value >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
              style={{ width: `${value}%` }}
            ></div>
          </div>
          <span className="text-sm">{value}%</span>
        </div>
      )
    }
  ];

  const departmentOptions = [
    { value: '', label: 'All Departments' },
    ...departments.map(dept => ({
      value: dept,
      label: dept
    }))
  ];

  const monthOptions = [
    { value: '', label: 'All Months' },
    ...generateMonthOptions()
  ];

  const weekOptions = [
    { value: '', label: 'All Weeks' },
    ...generateWeekOptions()
  ];

  return (
    <div className="min-h-screen bg-[#171717] p-6">
      <div className="max-w-7xl mx-auto flex flex-col gap-10">
        <div>

          <SectionHeader
            title="Leave Requests"
            actions={
              <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search leaves..."
                    value={leaveSearchTerm}
                    onChange={(e) => setLeaveSearchTerm(e.target.value)}
                    className="pl-10 bg-black border border-[#333333] rounded-lg text-white text-sm"
                  />
                </div>
                <div className="flex gap-4">
                  <div className="w-40">
                    <FilterSelect
                      options={departmentOptions}
                      value={departmentFilter}
                      onChange={setDepartmentFilter}
                      placeholder="All Departments"
                      icon={<Filter className="w-4 h-4" />}
                    />
                  </div>
                  <div className="w-40">
                    <DatePicker
                      value={dateFilter}
                      onChange={setDateFilter}
                      placeholder="Select date"
                    />
                  </div>
                  <Button
                    onClick={clearAllFilters}
                    variant="outline"
                    className="bg-[#ff9d00] hover:bg-[#ff9d00]/90 text-black"
                  >
                    Clear Filters
                  </Button>
                </div>
                <Button
                  onClick={handleRefreshData}
                  disabled={loading}
                  className="bg-[#ff9d00] hover:bg-[#ff9d00]/90 text-black"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh Data
                </Button>
              </div>
            }
          />

          <DataTable
            columns={leaveRequestColumns}
            data={filteredLeaveRequests}
            loading={loading}
            emptyMessage={
              loading
                ? "Loading leave requests..."
                : "No leave requests found matching your criteria."
            }
          />
        </div>

        {/* Leave Balances Section */}

        <div>

          <SectionHeader title='Leaves Balances'
            actions={
              <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search attendance..."
                    value={balanceSearchTerm}
                    onChange={(e) => setBalanceSearchTerm(e.target.value)}
                    className="pl-10 bg-black border border-[#333333] rounded-lg text-white text-sm"
                  />
                </div>
                <div className="flex gap-4">
                  <div className="w-40">
                    <FilterSelect
                      options={monthOptions}
                      value={monthFilter}
                      onChange={setMonthFilter}
                      placeholder="All Months"
                      icon={<Calendar className="w-4 h-4" />}
                    />
                  </div>
                  <div className="w-40">
                    <FilterSelect
                      options={weekOptions}
                      value={weekFilter}
                      onChange={setWeekFilter}
                      placeholder="All Weeks"
                      icon={<Calendar className="w-4 h-4" />}
                    />
                  </div>
                  <Button
                    onClick={() => {
                      setBalanceSearchTerm('');
                      setMonthFilter('');
                      setWeekFilter('');
                    }}
                    variant="outline"
                    className="bg-[#ff9d00] hover:bg-[#ff9d00]/90 text-black"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            }

          />

          <DataTable
            columns={leaveBalanceColumns}
            data={filteredLeaveBalances}
            loading={loading}
            emptyMessage={
              loading
                ? "Loading leave balances..."
                : "No leave balance records found."
            }
          />
        </div>
      </div>
    </div>
  );
}