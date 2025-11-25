/// app/employees/[id]/leaves/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import FilterSelect from '@/Components/FilterSelect';
import DataTable from '@/Components/DataTable';
import SectionHeader from '@/Components/SectionHeader';
import { Button } from '@/Components/ui/button';

interface LeaveType {
  id: string;
  name: string;
  max_days: number;
  is_paid: boolean;
}

interface Employee {
  id: string;
  name: string;
  employee_id: string;
}

interface LeaveRequest {
  id: string;
  leave_type_id: string;
  total_days: number;
  start_date: string;
  end_date: string;
  status: 'approved' | 'rejected' | 'pending';
  reason: string;
  approved_by: string | null;
}

interface LeaveBalance {
  id: string;
  leave_type_id: string;
  allocated_days: number;
  used_days: number;
  carried_forward: number;
  year: number;
}

interface TransformedLeaveRequest {
  id: string;
  leave_type: LeaveType;
  total_days: number;
  start_date: string;
  end_date: string;
  status: 'approved' | 'rejected' | 'pending';
  reason: string;
  approved_by: string | null;
  leave_type_id: string;
  employee_name: string;
  employee_id: string;
}

interface TransformedLeaveBalance {
  id: string;
  leave_type: LeaveType;
  allocated_days: number;
  used_days: number;
  remained: number;
  leave_type_id: string;
}

interface LeaveFormData {
  leave_type_id: string;
  start_date: string;
  end_date: string;
  reason: string;
}

export default function EmployeeLeaves() {
  const params = useParams();
  const employeeId = params.id as string;

  const [leaveRequests, setLeaveRequests] = useState<TransformedLeaveRequest[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<TransformedLeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<LeaveFormData>({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: ''
  });

  // Filter states for Leave Requests
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  // Filter states for Leave Balance
  const [balanceMonthFilter, setBalanceMonthFilter] = useState('');
  const [balanceYearFilter, setBalanceYearFilter] = useState(new Date().getFullYear().toString());

  // Check if any filters are applied
  const hasLeaveRequestFilters = searchQuery || dateFilter || monthFilter || yearFilter;
  const hasLeaveBalanceFilters = balanceMonthFilter || balanceYearFilter !== new Date().getFullYear().toString();

  // Fetch data from Supabase
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);

        // Fetch all data in parallel
        const [employeeResponse, leaveTypesResponse, leaveRequestsResponse, leaveBalancesResponse] = await Promise.all([
          supabaseAdmin
            .from('employees')
            .select('id, name, employee_id')
            .eq('id', employeeId)
            .single(),
          supabaseAdmin
            .from('leave_types')
            .select('*')
            .eq('status', 'active'),
          supabaseAdmin
            .from('leave_requests')
            .select('*')
            .eq('employee_id', employeeId)
            .order('created_at', { ascending: false }),
          supabaseAdmin
            .from('leave_balances')
            .select('*')
            .eq('employee_id', employeeId)
            .eq('year', parseInt(balanceYearFilter) || new Date().getFullYear())
        ]);

        if (employeeResponse.error) throw employeeResponse.error;
        if (leaveTypesResponse.error) throw leaveTypesResponse.error;
        if (leaveRequestsResponse.error) throw leaveRequestsResponse.error;
        if (leaveBalancesResponse.error) throw leaveBalancesResponse.error;

        setEmployee(employeeResponse.data);
        setLeaveTypes(leaveTypesResponse.data || []);

        // Transform leave requests data with the fetched data
        const transformedRequests: TransformedLeaveRequest[] = (leaveRequestsResponse.data || []).map((request: LeaveRequest) => {
          const leaveType = leaveTypesResponse.data?.find(lt => lt.id === request.leave_type_id) || { id: '', name: 'Unknown', max_days: 0, is_paid: false };
          
          return {
            id: request.id,
            leave_type: leaveType,
            total_days: request.total_days,
            start_date: request.start_date,
            end_date: request.end_date,
            status: request.status,
            reason: request.reason,
            approved_by: request.approved_by,
            leave_type_id: request.leave_type_id,
            employee_name: employeeResponse.data?.name || 'Unknown',
            employee_id: employeeResponse.data?.employee_id || 'Unknown'
          };
        });

        // Transform leave balances data with the fetched data
        const transformedBalances: TransformedLeaveBalance[] = (leaveBalancesResponse.data || []).map((balance: LeaveBalance) => {
          const leaveType = leaveTypesResponse.data?.find(lt => lt.id === balance.leave_type_id) || { id: '', name: 'Unknown', max_days: 0, is_paid: false };
          
          return {
            id: balance.id,
            leave_type: leaveType,
            allocated_days: balance.allocated_days,
            used_days: balance.used_days,
            remained: balance.allocated_days - balance.used_days,
            leave_type_id: balance.leave_type_id
          };
        });

        setLeaveRequests(transformedRequests);
        setLeaveBalances(transformedBalances);

      } catch (error) {
        console.error('Error fetching employee leaves:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [employeeId, balanceYearFilter]);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Calculate total days
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      const timeDiff = endDate.getTime() - startDate.getTime();
      const totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

      // Insert leave request
      const { data, error } = await supabaseAdmin
        .from('leave_requests')
        .insert([
          {
            employee_id: employeeId,
            leave_type_id: formData.leave_type_id,
            start_date: formData.start_date,
            end_date: formData.end_date,
            total_days: totalDays,
            reason: formData.reason,
            status: 'pending',
            approved_by: null
          }
        ])
        .select();

      if (error) throw error;

      // Refresh data
      const [leaveRequestsResponse, leaveBalancesResponse] = await Promise.all([
        supabaseAdmin
          .from('leave_requests')
          .select('*')
          .eq('employee_id', employeeId)
          .order('created_at', { ascending: false }),
        supabaseAdmin
          .from('leave_balances')
          .select('*')
          .eq('employee_id', employeeId)
          .eq('year', parseInt(balanceYearFilter) || new Date().getFullYear())
      ]);

      if (leaveRequestsResponse.error) throw leaveRequestsResponse.error;
      if (leaveBalancesResponse.error) throw leaveBalancesResponse.error;

      // Transform the new data
      const transformedRequests: TransformedLeaveRequest[] = (leaveRequestsResponse.data || []).map((request: LeaveRequest) => {
        const leaveType = leaveTypes.find(lt => lt.id === request.leave_type_id) || { id: '', name: 'Unknown', max_days: 0, is_paid: false };
        
        return {
          id: request.id,
          leave_type: leaveType,
          total_days: request.total_days,
          start_date: request.start_date,
          end_date: request.end_date,
          status: request.status,
          reason: request.reason,
          approved_by: request.approved_by,
          leave_type_id: request.leave_type_id,
          employee_name: employee?.name || 'Unknown',
          employee_id: employee?.employee_id || 'Unknown'
        };
      });

      const transformedBalances: TransformedLeaveBalance[] = (leaveBalancesResponse.data || []).map((balance: LeaveBalance) => {
        const leaveType = leaveTypes.find(lt => lt.id === balance.leave_type_id) || { id: '', name: 'Unknown', max_days: 0, is_paid: false };
        
        return {
          id: balance.id,
          leave_type: leaveType,
          allocated_days: balance.allocated_days,
          used_days: balance.used_days,
          remained: balance.allocated_days - balance.used_days,
          leave_type_id: balance.leave_type_id
        };
      });

      setLeaveRequests(transformedRequests);
      setLeaveBalances(transformedBalances);

      // Close modal and reset form
      setIsModalOpen(false);
      setFormData({
        leave_type_id: '',
        start_date: '',
        end_date: '',
        reason: ''
      });

      alert('Leave application submitted successfully!');

    } catch (error) {
      console.error('Error applying for leave:', error);
      alert('Error submitting leave application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormChange = (field: keyof LeaveFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Filter leave requests based on filters
  const filteredLeaveRequests = leaveRequests.filter(request => {
    // Search filter
    if (searchQuery && !request.leave_type.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !request.reason.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Date filter - Check if the selected date falls within the leave period
    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      const startDate = new Date(request.start_date);
      const endDate = new Date(request.end_date);
      
      // Reset time part for accurate date comparison
      filterDate.setHours(0, 0, 0, 0);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      
      if (!(filterDate >= startDate && filterDate <= endDate)) {
        return false;
      }
    }

    // Month filter
    if (monthFilter) {
      const requestMonth = (new Date(request.start_date).getMonth() + 1).toString();
      if (requestMonth !== monthFilter) {
        return false;
      }
    }

    // Year filter
    if (yearFilter) {
      const requestYear = new Date(request.start_date).getFullYear().toString();
      if (requestYear !== yearFilter) {
        return false;
      }
    }

    return true;
  });

  // Filter options
  const monthOptions = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  // Table columns
  const leaveRequestsColumns = [
    { key: 'id', label: 'Leave ID' },
    { 
      key: 'employee_name', 
      label: 'Employee', 
      render: (value: string) => value 
    },
    { 
      key: 'type', 
      label: 'Type', 
      render: (value: any, row: TransformedLeaveRequest) => row.leave_type.name 
    },
    { key: 'total_days', label: 'Total Days' },
    { 
      key: 'start_date', 
      label: 'From', 
      render: (value: string) => new Date(value).toLocaleDateString('en-GB') 
    },
    { 
      key: 'end_date', 
      label: 'To', 
      render: (value: string) => new Date(value).toLocaleDateString('en-GB') 
    },
    { 
      key: 'approved_by', 
      label: 'Approved', 
      render: (value: string | null, row: TransformedLeaveRequest) => 
        row.status === 'approved' ? (value || 'Manager') : '—' 
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (value: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'approved' ? 'bg-green-500/20 text-green-400' :
          value === 'rejected' ? 'bg-red-500/20 text-red-400' :
          'bg-yellow-500/20 text-yellow-400'
        }`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      )
    },
    { 
      key: 'reason', 
      label: 'Reason',
      render: (value: string) => value.length > 50 ? `${value.substring(0, 50)}...` : value
    }
  ];

  const leaveBalanceColumns = [
    { 
      key: 'emp_id', 
      label: 'Emp ID', 
      render: () => employee?.employee_id || employeeId.substring(0, 8).toUpperCase() 
    },
    { 
      key: 'type', 
      label: 'Type', 
      render: (value: any, row: TransformedLeaveBalance) => row.leave_type.name 
    },
    { key: 'allocated_days', label: 'Allocated' },
    { key: 'used_days', label: 'Used' },
    { key: 'remained', label: 'Remained' }
  ];

  // Leave Requests Actions
  const leaveRequestsActions = (
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
          className="w-full p-2 rounded-lg bg-black border border-[#333333] text-white text-sm [color-scheme:dark]"
        />
      </div>

      {/* Month Filter */}
      <div className="w-full sm:w-36">
        <FilterSelect
          options={monthOptions}
          value={monthFilter}
          onChange={setMonthFilter}
          placeholder="Month"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
          }
        />
      </div>

      {/* Year Filter - Number Input */}
      <input
        type="number"
        placeholder="Year"
        value={yearFilter}
        onChange={(e) => setYearFilter(e.target.value)}
        min="2025"
        className="w-full sm:w-24 p-2 rounded-lg bg-black border border-[#333333] text-white text-sm"
      />

      {/* Clear Button - Only show when filters are applied */}
      {hasLeaveRequestFilters && (
        <Button
          onClick={() => {
            setSearchQuery('');
            setDateFilter('');
            setMonthFilter('');
            setYearFilter('');
          }}
          className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#ff9d00] text-black font-medium text-sm hover:bg-[#ff9d00]/90 transition-colors"
        >
          Clear
        </Button>
      )}

      {/* Apply Leave Button */}
      <Button
        onClick={() => setIsModalOpen(true)}
        className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#ff9d00] text-black font-medium text-sm hover:bg-[#ff9d00]/90 transition-colors"
      >
        Apply Leave
      </Button>
    </div>
  );

  // Leave Balance Actions
  const leaveBalanceActions = (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center w-full sm:w-auto">
      {/* Month Filter */}
      <div className="w-full sm:w-36">
        <FilterSelect
          options={monthOptions}
          value={balanceMonthFilter}
          onChange={setBalanceMonthFilter}
          placeholder="Month"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
          }
        />
      </div>

      {/* Year Filter - Number Input */}
      <input
        type="number"
        placeholder="Year"
        value={balanceYearFilter}
        onChange={(e) => setBalanceYearFilter(e.target.value)}
        min="2020"
        max="2030"
        className="w-full sm:w-24 p-2 rounded-lg bg-black border border-[#333333] text-white text-sm"
      />

      {/* Clear Button - Only show when filters are applied */}
      {hasLeaveBalanceFilters && (
        <Button
          onClick={() => {
            setBalanceMonthFilter('');
            setBalanceYearFilter(new Date().getFullYear().toString());
          }}
          className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#ff9d00] text-black font-medium text-sm hover:bg-[#ff9d00]/90 transition-colors"
        >
          Clear
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#171717] text-white p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Leave Requests Section */}
        <section className="mb-8">
          <SectionHeader
            title="Leave Requests"
            actions={leaveRequestsActions}
          />

          {/* Leave Requests Table */}
          <DataTable
            columns={leaveRequestsColumns}
            data={filteredLeaveRequests}
            loading={loading}
            emptyMessage="No leave requests found"
          />
        </section>

        {/* Leave Balance Section */}
        <section>
          <SectionHeader
            title="Leave Balance"
            actions={leaveBalanceActions}
          />

          {/* Leave Balance Table */}
          <DataTable
            columns={leaveBalanceColumns}
            data={leaveBalances}
            loading={loading}
            emptyMessage="No leave balance data found"
          />
        </section>
      </div>

      {/* Apply Leave Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#111111] rounded-xl border border-[#333333] w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">Apply for Leave</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleApplyLeave} className="space-y-4">
                {/* Leave Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Leave Type *
                  </label>
                  <select
                    value={formData.leave_type_id}
                    onChange={(e) => handleFormChange('leave_type_id', e.target.value)}
                    required
                    className="w-full p-3 rounded-lg bg-black border border-[#333333] text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Leave Type</option>
                    {leaveTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name} (Max: {type.max_days} days)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleFormChange('start_date', e.target.value)}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full p-3 rounded-lg bg-black border border-[#333333] text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 [color-scheme:dark]"
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleFormChange('end_date', e.target.value)}
                    required
                    min={formData.start_date || new Date().toISOString().split('T')[0]}
                    className="w-full p-3 rounded-lg bg-black border border-[#333333] text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 [color-scheme:dark]"
                  />
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Reason *
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => handleFormChange('reason', e.target.value)}
                    required
                    rows={4}
                    placeholder="Please provide a reason for your leave..."
                    className="w-full p-3 rounded-lg bg-black border border-[#333333] text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>

                {/* Submit Button */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 rounded-lg bg-gray-600 text-white font-medium text-sm hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 rounded-lg bg-[#ff9d00] text-black font-medium text-sm hover:bg-[#ff9d00]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Submitting...' : 'Apply for Leave'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}