// app/admin/leaves/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import SectionHeader from '@/Components/SectionHeader';
import DataTable from '@/Components/DataTable';

interface LeaveDetails {
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
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'on-leave';
  remarks?: string;
  requested_at: string;
  approved_by?: string;
  approved_at?: string;
}

interface LeaveRecord {
  id: string;
  leave_type: string;
  duration: number;
  from: string;
  to: string;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'on-leave';
  remarks: string;
}

export default function LeaveDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const leaveId = params.id as string;
  
  const [leaveDetails, setLeaveDetails] = useState<LeaveDetails | null>(null);
  const [employeeLeaves, setEmployeeLeaves] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const supabase = supabaseAdmin;

  useEffect(() => {
    if (leaveId) {
      fetchLeaveDetails();
    }
  }, [leaveId]);

  const fetchLeaveDetails = async () => {
    try {
      setLoading(true);
      console.log('Fetching leave details for ID:', leaveId);

      // Fetch leave request with related data
      const { data: leaveRequest, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          employees!inner (
            id,
            employee_id,
            name,
            department_id,
            role_id,
            departments!inner (id, name),
            roles!inner (id, role_name)
          ),
          leave_types!inner (id, name)
        `)
        .eq('id', leaveId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching leave details:', error);
        await fetchLeaveDetailsAlternative();
        return;
      }

      if (!leaveRequest) {
        console.error('Leave request not found');
        setLeaveDetails(null);
        return;
      }

      console.log('Raw leave request data:', leaveRequest);

      // Transform the data
      const transformedDetails: LeaveDetails = {
        id: leaveRequest.id,
        employee_id: leaveRequest.employee_id,
        employee_number: leaveRequest.employees.employee_id,
        employee_name: leaveRequest.employees.name,
        department_name: leaveRequest.employees.departments.name,
        role_name: leaveRequest.employees.roles.role_name,
        leave_type_name: leaveRequest.leave_types.name,
        start_date: leaveRequest.start_date,
        end_date: leaveRequest.end_date,
        total_days: leaveRequest.total_days,
        reason: leaveRequest.reason,
        status: leaveRequest.status,
        remarks: leaveRequest.remarks,
        requested_at: leaveRequest.created_at,
        approved_by: leaveRequest.approved_by,
        approved_at: leaveRequest.approved_at
      };

      console.log('Transformed leave details:', transformedDetails);
      setLeaveDetails(transformedDetails);

      // Fetch all leaves for this employee
      await fetchEmployeeLeaves(leaveRequest.employee_id);

    } catch (error) {
      console.error('Error in fetchLeaveDetails:', error);
      setLeaveDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeLeaves = async (employeeId: string) => {
    try {
      const { data: leaveRequests, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          leave_types!inner (id, name)
        `)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching employee leaves:', error);
        return;
      }

      if (leaveRequests) {
        const formattedLeaves: LeaveRecord[] = leaveRequests.map(leave => ({
          id: leave.id,
          leave_type: leave.leave_types.name,
          duration: leave.total_days,
          from: formatDate(leave.start_date),
          to: formatDate(leave.end_date),
          status: leave.status,
          remarks: leave.remarks || 'No remarks'
        }));

        setEmployeeLeaves(formattedLeaves);
      }
    } catch (error) {
      console.error('Error fetching employee leaves:', error);
    }
  };

  const fetchLeaveDetailsAlternative = async () => {
    try {
      // Fetch leave request basic data
      const { data: leaveRequest, error: leaveError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('id', leaveId)
        .single();

      if (leaveError || !leaveRequest) {
        console.error('Error fetching leave request:', leaveError);
        setLeaveDetails(null);
        return;
      }

      // Fetch employee data separately
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id, employee_id, name, department_id, role_id')
        .eq('id', leaveRequest.employee_id)
        .single();

      if (empError || !employee) {
        console.error('Error fetching employee:', empError);
        setLeaveDetails(null);
        return;
      }

      // Fetch department
      const { data: department, error: deptError } = await supabase
        .from('departments')
        .select('id, name')
        .eq('id', employee.department_id)
        .single();

      // Fetch role
      const { data: role, error: roleError } = await supabase
        .from('roles')
        .select('id, role_name')
        .eq('id', employee.role_id)
        .single();

      // Fetch leave type
      const { data: leaveType, error: typeError } = await supabase
        .from('leave_types')
        .select('id, name')
        .eq('id', leaveRequest.leave_type_id)
        .single();

      const transformedDetails: LeaveDetails = {
        id: leaveRequest.id,
        employee_id: leaveRequest.employee_id,
        employee_number: employee.employee_id,
        employee_name: employee.name,
        department_name: department?.name || 'No Department',
        role_name: role?.role_name || 'No Role',
        leave_type_name: leaveType?.name || 'Unknown Leave Type',
        start_date: leaveRequest.start_date,
        end_date: leaveRequest.end_date,
        total_days: leaveRequest.total_days,
        reason: leaveRequest.reason,
        status: leaveRequest.status,
        remarks: leaveRequest.remarks,
        requested_at: leaveRequest.created_at,
        approved_by: leaveRequest.approved_by,
        approved_at: leaveRequest.approved_at
      };

      setLeaveDetails(transformedDetails);
      
      // Fetch all leaves for this employee
      await fetchEmployeeLeaves(leaveRequest.employee_id);

    } catch (error) {
      console.error('Error in alternative fetch:', error);
      setLeaveDetails(null);
    }
  };

  const handleApprove = async () => {
    try {
      setActionLoading(true);
      
      const { error } = await supabase
        .from('leave_requests')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString(),
          remarks: 'Leave approved by administrator'
        })
        .eq('id', leaveId);

      if (error) throw error;

      await fetchLeaveDetails();
      
    } catch (error) {
      console.error('Error approving leave:', error);
      alert('Error approving leave. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      setActionLoading(true);
      
      const { error } = await supabase
        .from('leave_requests')
        .update({ 
          status: 'rejected',
          approved_at: new Date().toISOString(),
          remarks: 'Leave rejected by administrator'
        })
        .eq('id', leaveId);

      if (error) throw error;

      await fetchLeaveDetails();
      
    } catch (error) {
      console.error('Error rejecting leave:', error);
      alert('Error rejecting leave. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500 text-white">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500 text-white">Rejected</Badge>;
      case 'on-leave':
        return <Badge className="bg-blue-500 text-white">On-leave</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500 text-white">Pending</Badge>;
      default:
        return <Badge className="bg-gray-500 text-white">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Define columns for DataTable
  const columns = [
    {
      key: 'id',
      label: 'Leave ID',
      sortable: true,
      render: (value: string) => (
        <span className="font-mono text-sm">{value}</span>
      )
    },
    {
      key: 'leave_type',
      label: 'Leave Type',
      sortable: true
    },
    {
      key: 'duration',
      label: 'Duration',
      sortable: true,
      render: (value: number) => `${value} days`
    },
    {
      key: 'from',
      label: 'From',
      sortable: true
    },
    {
      key: 'to',
      label: 'To',
      sortable: true
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string) => getStatusBadge(value)
    },
    {
      key: 'remarks',
      label: 'Remarks',
      sortable: false,
      render: (value: string) => (
        <span className="truncate block max-w-xs" title={value}>
          {value}
        </span>
      )
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#171717] p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-1/3 mb-6"></div>
            <div className="h-64 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!leaveDetails) {
    return (
      <div className="min-h-screen bg-[#171717] p-6">
        <div className="max-w-6xl mx-auto">
          <SectionHeader 
            title="Leave Details Not Found" 
            actions={
              <Button
                onClick={() => router.back()}
                className="bg-[#ff9d00] hover:bg-[#ff9d00]/90 text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            }
          />
          <div className="bg-[#111111] rounded-xl border border-[#333333] p-8 text-center">
            <p className="text-gray-400">Leave request not found or you don't have permission to view it.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#171717] p-6">
      <div className="max-w-6xl mx-auto">
        <SectionHeader 
          title={`Leave Details | ${leaveDetails.employee_name}`}
          actions={
            <div className="flex space-x-3">
              <Button
                onClick={() => router.back()}
                variant="outline"
                className="border-[#333333] text-gray-400 hover:text-white hover:bg-[#333333]"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Leaves
              </Button>
              
              {leaveDetails.status === 'pending' && (
                <>
                  <Button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {actionLoading ? 'Approving...' : 'Approve Leave'}
                  </Button>
                  <Button
                    onClick={handleReject}
                    disabled={actionLoading}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {actionLoading ? 'Rejecting...' : 'Reject Leave'}
                  </Button>
                </>
              )}
            </div>
          }
        />

        {/* Leave Records Table using DataTable Component */}
        <DataTable
          columns={columns}
          data={employeeLeaves}
          loading={loading}
          emptyMessage="No leave records found for this employee."
          className="mt-6"
        />
      </div>
    </div>
  );
}