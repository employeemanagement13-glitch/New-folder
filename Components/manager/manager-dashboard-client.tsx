'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { TeamMember, AttendanceTrend, LeaveRequest } from '@/type/managerDashboard';
import DataTable from '@/Components/DataTable';
import SectionHeader from '@/Components/SectionHeader';
import BarChart from '@/Components/charts/BarChart';
import LineChart from '@/Components/charts/LineChart';
import EditEmployeeModal from './EditEmployeeModal';

interface ManagerData {
  id: string;
  name: string;
  department_id: string;
  department_name: string;
}

interface ManagerDashboardClientProps {
  managerId: string;
  managerData: ManagerData;
}

export default function ManagerDashboardClient({ managerId, managerData }: ManagerDashboardClientProps) {
  const router = useRouter();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [attendanceTrend, setAttendanceTrend] = useState<AttendanceTrend[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingEmployee, setEditingEmployee] = useState<TeamMember | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Fetch team members data
  useEffect(() => {
    fetchTeamMembers();
  }, [managerData.department_id, managerId]);

  const fetchTeamMembers = async () => {
    if (!managerData.department_id) return;

    setLoading(true);

    try {
      // Fetch employees in manager's department (excluding the manager)
      const { data: employeesData, error: employeesError } = await supabaseAdmin
        .from('employees')
        .select('*')
        .eq('department_id', managerData.department_id)
        .eq('status', 'active')
        .neq('id', managerId);

      if (employeesError) {
        console.error('Error fetching employees:', employeesError);
        return;
      }

      // Fetch roles and departments separately to avoid relationship issues
      const teamMembersWithStats = await Promise.all(
        (employeesData || []).map(async (employee) => {
          // Get role name
          const { data: roleData } = await supabaseAdmin
            .from('roles')
            .select('role_name')
            .eq('id', employee.role_id)
            .single();

          // Get department name
          const { data: deptData } = await supabaseAdmin
            .from('departments')
            .select('name')
            .eq('id', employee.department_id)
            .single();

          // Calculate attendance percentage (last 30 days)
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          const { data: attendanceData } = await supabaseAdmin
            .from('attendance')
            .select('status')
            .eq('employee_id', employee.id)
            .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

          const presentDays = attendanceData?.filter(record => 
            record.status === 'present' || record.status === 'late'
          ).length || 0;
          const totalDays = attendanceData?.length || 1;
          const attendancePercentage = Math.round((presentDays / totalDays) * 100);

          // Count pending leaves
          const { data: pendingLeavesData } = await supabaseAdmin
            .from('leave_requests')
            .select('id')
            .eq('employee_id', employee.id)
            .eq('status', 'pending');

          const pendingLeaves = pendingLeavesData?.length || 0;

          return {
            ...employee,
            attendance_percentage: attendancePercentage,
            pending_leaves: pendingLeaves,
            role_name: roleData?.role_name || 'N/A',
            department_name: deptData?.name || 'N/A'
          };
        })
      );

      setTeamMembers(teamMembersWithStats);
    } catch (error) {
      console.error('Error in fetchTeamMembers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch attendance trend data
  useEffect(() => {
    const fetchAttendanceTrend = async () => {
      if (!managerData.department_id) return;

      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Get all employees in the department first
        const { data: departmentEmployees } = await supabaseAdmin
          .from('employees')
          .select('id')
          .eq('department_id', managerData.department_id)
          .eq('status', 'active');

        if (!departmentEmployees || departmentEmployees.length === 0) {
          setAttendanceTrend([]);
          return;
        }

        const employeeIds = departmentEmployees.map(emp => emp.id);

        // Then get attendance data for these employees
        const { data: attendanceData } = await supabaseAdmin
          .from('attendance')
          .select('*')
          .in('employee_id', employeeIds)
          .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
          .order('date', { ascending: true });

        if (!attendanceData) {
          setAttendanceTrend([]);
          return;
        }

        // Group by date and calculate present count
        const trendMap = new Map();
        
        attendanceData.forEach(record => {
          const date = record.date;
          if (!trendMap.has(date)) {
            trendMap.set(date, { present: 0, total: 0 });
          }
          
          const dayData = trendMap.get(date);
          dayData.total++;
          if (record.status === 'present' || record.status === 'late') {
            dayData.present++;
          }
          trendMap.set(date, dayData);
        });

        const trendData: AttendanceTrend[] = Array.from(trendMap.entries()).map(([date, data]) => ({
          date,
          present_count: data.present,
          total_employees: data.total
        }));

        setAttendanceTrend(trendData);
      } catch (error) {
        console.error('Error in fetchAttendanceTrend:', error);
      }
    };

    fetchAttendanceTrend();
  }, [managerData.department_id]);

  // Fetch leave requests
  useEffect(() => {
    const fetchLeaveRequests = async () => {
      if (!managerData.department_id) return;

      try {
        // Get employees in the department first
        const { data: departmentEmployees } = await supabaseAdmin
          .from('employees')
          .select('id, name')
          .eq('department_id', managerData.department_id)
          .eq('status', 'active');

        if (!departmentEmployees) return;

        const employeeIds = departmentEmployees.map(emp => emp.id);

        // Then get leave requests for these employees
        const { data: leaveData } = await supabaseAdmin
          .from('leave_requests')
          .select('*')
          .in('employee_id', employeeIds)
          .eq('status', 'pending')
          .order('start_date', { ascending: true });

        if (!leaveData) return;

        // Get leave type names
        const leaveRequestsWithDetails = await Promise.all(
          leaveData.map(async (leave) => {
            const { data: leaveTypeData } = await supabaseAdmin
              .from('leave_types')
              .select('name')
              .eq('id', leave.leave_type_id)
              .single();

            const employee = departmentEmployees.find(emp => emp.id === leave.employee_id);

            return {
              id: leave.id,
              employee_id: leave.employee_id,
              employee_name: employee?.name || 'Unknown',
              leave_type: leaveTypeData?.name || 'Unknown',
              start_date: leave.start_date,
              end_date: leave.end_date,
              status: leave.status,
              total_days: leave.total_days
            };
          })
        );

        setLeaveRequests(leaveRequestsWithDetails);
      } catch (error) {
        console.error('Error in fetchLeaveRequests:', error);
      }
    };

    fetchLeaveRequests();
  }, [managerData.department_id]);

  // Handle Edit Employee
  const handleEditEmployee = (employee: TeamMember) => {
    setEditingEmployee(employee);
    setIsEditModalOpen(true);
  };

  // Handle Update Employee
  const handleUpdateEmployee = async (updatedData: Partial<TeamMember>) => {
    if (!editingEmployee) return;

    setUpdating(true);
    try {
      const { error } = await supabaseAdmin
        .from('employees')
        .update({
          name: updatedData.name,
          email: updatedData.email,
          phone: updatedData.phone,
          role_id: updatedData.role_id,
          employment_type: updatedData.employment_type,
          status: updatedData.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingEmployee.id);

      if (error) {
        console.error('Error updating employee:', error);
        alert('Error updating employee: ' + error.message);
        return;
      }

      // Refresh the team members data
      await fetchTeamMembers();
      setIsEditModalOpen(false);
      setEditingEmployee(null);
      alert('Employee updated successfully!');
    } catch (error) {
      console.error('Error updating employee:', error);
      alert('Error updating employee');
    } finally {
      setUpdating(false);
    }
  };

  // Handle View Employee Attendance
  const handleViewAttendance = (employeeId: string) => {
    router.push(`/manager/${managerId}/attendance/${employeeId}`);
  };

  // Filter team members based on search
  const filteredTeamMembers = teamMembers.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.employee_id.includes(searchTerm)
  );

  // Format data for charts
  const attendanceChartData = attendanceTrend.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }),
    present: item.present_count,
    percentage: item.total_employees > 0 
      ? Math.round((item.present_count / item.total_employees) * 100)
      : 0
  }));

  // Calculate leave distribution by type
  const leaveByType = leaveRequests.reduce((acc, request) => {
    acc[request.leave_type] = (acc[request.leave_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const leaveChartData = Object.entries(leaveByType).map(([type, count]) => ({
    type,
    count
  }));

  // Team Members Table Columns
  const teamMembersColumns = [
    {
      key: 'employee_id',
      label: 'Emp ID',
      sortable: true
    },
    {
      key: 'name',
      label: 'Emp Name',
      sortable: true
    },
    {
      key: 'department_name',
      label: 'Department',
      sortable: true
    },
    {
      key: 'role_name',
      label: 'Role',
      sortable: true
    },
    {
      key: 'attendance_percentage',
      label: 'Alt %',
      sortable: true,
      render: (value: number) => (
        <span className={`px-2 py-1 rounded-full text-xs ${
          value >= 90 
            ? 'bg-green-500/20 text-green-400'
            : value >= 80
            ? 'bg-yellow-500/20 text-yellow-400'
            : 'bg-red-500/20 text-red-400'
        }`}>
          {value}%
        </span>
      )
    },
    {
      key: 'pending_leaves',
      label: 'Pen Leaves',
      sortable: true,
      render: (value: number) => (
        <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs">
          {value}
        </span>
      )
    },
    {
      key: 'joining_date',
      label: 'Join Date',
      sortable: true,
      render: (value: string) => 
        new Date(value).toLocaleDateString('en-US', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }).replace(/\//g, ' / ')
    },
    {
      key: 'actions',
      label: 'Action',
      render: (value: any, row: TeamMember) => (
        <div className="flex space-x-2">
          <button 
            onClick={() => handleViewAttendance(row.id)}
            className="px-3 py-1 text-[#ff9d00] cursor-pointer rounded text-xs font-medium hover:text-[#e68e00] transition-colors"
          >
            View
          </button>
          <button 
            onClick={() => handleEditEmployee(row)}
            className="px-3 py-1 text-white cursor-pointer rounded text-xs font-medium hover:text-[#dedede] transition-colors"
          >
            Edit
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-[#171717] text-white p-6">
      {/* Header */}
      <div className="mb-8 flex gap-10 justify-between items-center">
        {/* <div>
          <h1 className="text-2xl font-bold mb-2">Team Members</h1>
          <p className="text-gray-400 mb-4">
            Manager: {managerData.name} | Department: {managerData.department_name}
          </p>
        </div> */}
        
        {/* Search Bar */}
        {/* <div className="max-w-md">
          <input
            type="text"
            placeholder="Search team members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-[#111111] border border-[#333333] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#ff9d00]"
          />
        </div> */}
      </div>

      {/* Main Content Grid */}
      <div className="flex flex-col gap-10">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Team Members Table  bg-[#111111]  rounded-lg p-6*/}
          <div className="">
            <SectionHeader 
              title="Team Members"
              description={`${filteredTeamMembers.length} team members in your department`}
              actions={
        <div className="max-w-md">
          <input
            type="text"
            placeholder="Search team members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-[#111111] border border-[#333333] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#ff9d00]"
          />
        </div>
              }
            />
            <DataTable 
              columns={teamMembersColumns}
              data={filteredTeamMembers}
              loading={loading}
              emptyMessage={searchTerm ? "No team members found" : "No team members in your department"}
            />
          </div>

          {/* Attendance Trend  bg-[#111111]*/}
          <div className="bg-[#111111] rounded-lg p-6">
            <SectionHeader 
              title="Attendance Trend"
              description="Team attendance over the last 30 days"
            />
            {attendanceChartData.length > 0 ? (
              <LineChart 
                data={attendanceChartData}
                dataKey="percentage"
                xAxisKey="date"
                strokeColor="#ff9d00"
                height={250}
              />
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                No attendance data available
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Leave Requests */}
          <div className="bg-[#111111] rounded-lg p-6">
            <SectionHeader 
              title="Leave Requests"
              description={`${leaveRequests.length} pending leave requests`}
            />
            
            {/* Leave Requests Chart */}
            <div className="mb-6">
              {leaveChartData.length > 0 ? (
                <BarChart 
                  data={leaveChartData}
                  dataKey="count"
                  xAxisKey="type"
                  fillColor="#ff9d00"
                  height={200}
                />
              ) : (
                <div className="h-48 flex items-center justify-center text-gray-400">
                  No leave request data available
                </div>
              )}
            </div>

            {/* Leave Requests List */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Pending Requests</h3>
              {leaveRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-[#1a1a1a] rounded-lg p-4 border border-[#333333]"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-white">{request.employee_name}</div>
                      <div className="text-gray-400 text-xs">{request.leave_type}</div>
                    </div>
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">
                      Pending
                    </span>
                  </div>
                  <div className="text-gray-300 text-xs">
                    {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                    <span className="ml-2">({request.total_days} days)</span>
                  </div>
                </div>
              ))}

              {leaveRequests.length === 0 && (
                <div className="text-center py-4 text-gray-400 text-sm">
                  No pending leave requests
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Employee Modal */}
      {isEditModalOpen && editingEmployee && (
        <EditEmployeeModal
          employee={editingEmployee}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingEmployee(null);
          }}
          onUpdate={handleUpdateEmployee}
          loading={updating}
        />
      )}
    </div>
  );
}