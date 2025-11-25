// app/admin/departments/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import DataTable from '@/Components/DataTable';
import SectionHeader from '@/Components/SectionHeader';

interface Department {
  id: string;
  name: string;
  description: string | null;
  manager_id: string | null;
  location: string;
  status: 'active' | 'inactive';
  created_at: string;
  hod_name?: string;
  total_employees?: number;
}

interface DepartmentEmployee {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  role_id: string;
  joining_date: string;
  manager_id: string | null;
  status: string;
  employment_type: string;
  phone?: string;
  address?: string;
  // Joined fields
  roles?: {
    role_name: string;
  };
  manager?: {
    name: string;
  };
  attendance_percentage?: number;
}

export default function DepartmentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const departmentId = params.id as string;

  const [department, setDepartment] = useState<Department | null>(null);
  const [employees, setEmployees] = useState<DepartmentEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Get Employee role ID (default role for corrections)
  const getEmployeeRoleId = async (): Promise<string | null> => {
    try {
      const { data: employeeRole, error } = await supabaseAdmin
        .from('roles')
        .select('id')
        .eq('role_name', 'Employee')
        .single();

      if (error || !employeeRole) {
        console.error('❌ Error fetching Employee role:', error);
        return null;
      }

      return employeeRole.id;
    } catch (error) {
      console.error('❌ Error in getEmployeeRoleId:', error);
      return null;
    }
  };

  // Fix incorrect Department Manager roles
  const fixIncorrectDepartmentManagers = async (
    employeesData: any[], 
    departmentData: any, 
    departmentManagerRoleId: string | null
  ): Promise<any[]> => {
    if (!departmentManagerRoleId) return employeesData;

    const employeeRoleId = await getEmployeeRoleId();
    if (!employeeRoleId) return employeesData;

    const updatedEmployees = [...employeesData];

    for (let i = 0; i < updatedEmployees.length; i++) {
      const employee = updatedEmployees[i];
      const hasDepartmentManagerRole = employee.roles?.role_name === 'Department Manager';
      const isActualManager = employee.id === departmentData.manager_id;

      // If employee has Department Manager role but is NOT the actual manager
      if (hasDepartmentManagerRole && !isActualManager) {
        console.warn(`⚠️ Fixing role for ${employee.name}: Has Department Manager role but is not the actual manager`);
        
        try {
          // Update the employee's role to Employee
          const { error: updateError } = await supabaseAdmin
            .from('employees')
            .update({ role_id: employeeRoleId })
            .eq('id', employee.id);

          if (!updateError) {
            // Update the local data to reflect the change
            updatedEmployees[i] = {
              ...employee,
              role_id: employeeRoleId,
              roles: { role_name: 'Employee' }
            };
          } else {
            console.error(`❌ Error updating role for ${employee.name}:`, updateError);
          }
        } catch (updateErr) {
          console.error(`❌ Exception updating role for ${employee.name}:`, updateErr);
        }
      }
    }

    return updatedEmployees;
  };

  // Ensure the actual manager has Department Manager role
  const ensureManagerHasCorrectRole = async (
    employeesData: any[], 
    departmentData: any, 
    departmentManagerRoleId: string | null
  ): Promise<any[]> => {
    if (!departmentManagerRoleId || !departmentData.manager_id) return employeesData;

    const updatedEmployees = [...employeesData];
    const actualManager = updatedEmployees.find(emp => emp.id === departmentData.manager_id);
    
    if (actualManager && actualManager.roles?.role_name !== 'Department Manager') {
      console.warn(`⚠️ Actual manager ${actualManager.name} does not have Department Manager role`);
      
      try {
        const { error: updateError } = await supabaseAdmin
          .from('employees')
          .update({ role_id: departmentManagerRoleId })
          .eq('id', actualManager.id);

        if (!updateError) {
          // Update local data
          const managerIndex = updatedEmployees.findIndex(emp => emp.id === departmentData.manager_id);
          if (managerIndex !== -1) {
            updatedEmployees[managerIndex] = {
              ...actualManager,
              role_id: departmentManagerRoleId,
              roles: { role_name: 'Department Manager' }
            };
          }
        }
      } catch (updateErr) {
        console.error(`❌ Error updating manager role:`, updateErr);
      }
    }

    return updatedEmployees;
  };

  // Fetch department details and employees
  const fetchDepartmentDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching department details for ID:', departmentId);

      // Validate department ID
      if (!departmentId) {
        setError('Invalid department ID');
        return;
      }

      // Fetch department basic info
      const { data: departmentData, error: deptError } = await supabaseAdmin
        .from('departments')
        .select('*')
        .eq('id', departmentId)
        .single();

      if (deptError) {
        console.error('❌ Error fetching department:', deptError);
        setError(`Department not found: ${deptError.message}`);
        return;
      }

      if (!departmentData) {
        console.error('❌ Department not found');
        setError('Department not found');
        return;
      }

      console.log("✅ Department Data:", departmentData);

      // Get manager name if manager_id exists
      let hod_name = 'Not Assigned';
      
      if (departmentData.manager_id) {
        try {
          const { data: managerData, error: managerError } = await supabaseAdmin
            .from('employees')
            .select('name')
            .eq('id', departmentData.manager_id)
            .single();

          if (!managerError && managerData) {
            hod_name = managerData.name;
          }
        } catch (managerErr) {
          console.warn('⚠️ Error fetching manager:', managerErr);
        }
      }

      // Get Department Manager role ID for validation
      let departmentManagerRoleId: string | null = null;
      try {
        const { data: managerRole, error: roleError } = await supabaseAdmin
          .from('roles')
          .select('id')
          .eq('role_name', 'Department Manager')
          .single();

        if (!roleError && managerRole) {
          departmentManagerRoleId = managerRole.id;
        }
      } catch (roleErr) {
        console.warn('⚠️ Could not fetch Department Manager role:', roleErr);
      }

      // Fetch employees in this department
      let employeesData: any[] = [];
      try {
        const { data: empData, error: employeesError } = await supabaseAdmin
          .from('employees')
          .select(`
            *,
            roles (*),
            manager:employees!manager_id (name)
          `)
          .eq('department_id', departmentId)
          .eq('status', 'active')
          .order('name');

        if (employeesError) {
          console.error('❌ Error fetching employees:', employeesError);
        } else {
          employeesData = empData || [];
        }
      } catch (empErr) {
        console.error('❌ Exception fetching employees:', empErr);
      }

      console.log('✅ Employees data before validation:', employeesData);

      // STEP 1: Fix incorrect Department Manager roles
      let validatedEmployees = await fixIncorrectDepartmentManagers(
        employeesData, 
        departmentData, 
        departmentManagerRoleId
      );

      // STEP 2: Ensure actual manager has Department Manager role
      validatedEmployees = await ensureManagerHasCorrectRole(
        validatedEmployees,
        departmentData,
        departmentManagerRoleId
      );

      console.log('✅ Employees data after validation:', validatedEmployees);

      // Calculate attendance percentage for each employee
      const employeesWithAttendance = await Promise.all(
        validatedEmployees.map(async (employee) => {
          try {
            const attendancePercentage = await calculateAttendancePercentage(employee.id);
            return {
              ...employee,
              attendance_percentage: attendancePercentage
            };
          } catch (attendanceErr) {
            console.error(`❌ Error calculating attendance for ${employee.name}:`, attendanceErr);
            return {
              ...employee,
              attendance_percentage: 0
            };
          }
        })
      );

      setDepartment({
        ...departmentData,
        hod_name,
        total_employees: validatedEmployees.length
      });

      setEmployees(employeesWithAttendance);

    } catch (error) {
      console.error('💥 Unexpected error in fetchDepartmentDetails:', error);
      setError('An unexpected error occurred while loading department details');
    } finally {
      setLoading(false);
    }
  };

  // Calculate attendance percentage for an employee
  const calculateAttendancePercentage = async (employeeId: string): Promise<number> => {
    try {
      // Get current month dates
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Count working days (excluding weekends)
      let workingDays = 0;
      let currentDate = new Date(startOfMonth);
      
      while (currentDate <= endOfMonth) {
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Sunday (0) and Saturday (6)
          workingDays++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Count present days for this employee in current month
      const { data: attendanceData, error } = await supabaseAdmin
        .from('attendance')
        .select('status')
        .eq('employee_id', employeeId)
        .gte('date', startOfMonth.toISOString().split('T')[0])
        .lte('date', endOfMonth.toISOString().split('T')[0])
        .in('status', ['present', 'late', 'half_day']);

      if (error) {
        console.error('Error fetching attendance:', error);
        return 0;
      }

      const presentDays = attendanceData?.length || 0;

      if (workingDays === 0) return 100; // No working days in period

      return Math.round((presentDays / workingDays) * 100);
    } catch (error) {
      console.error('Error calculating attendance percentage:', error);
      return 0;
    }
  };

  useEffect(() => {
    if (departmentId) {
      fetchDepartmentDetails();
    }
  }, [departmentId]);

  // Filter employees based on search
  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.roles?.role_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get manager name for display
  const getManagerName = (employee: DepartmentEmployee): string => {
    // If this employee is the department manager, show "Self"
    if (employee.id === department?.manager_id) {
      return 'Self';
    }
    
    // If employee has a direct manager, show that
    if (employee.manager?.name) {
      return employee.manager.name;
    }
    
    // Otherwise, show the department HOD
    return department?.hod_name || 'Not Assigned';
  };

  // Table columns matching the image
  const columns = [
    {
      key: 'employee_id',
      label: 'Emp ID',
      sortable: true,
      render: (value: string) => (
        <span className="font-mono text-sm text-gray-300">{value}</span>
      )
    },
    {
      key: 'name',
      label: 'Emp Name',
      sortable: true,
    },
    {
      key: 'roles',
      label: 'Role',
      sortable: true,
      render: (value: any) => (
        <span className="text-gray-300">{value?.role_name || 'Unknown'}</span>
      )
    },
    {
      key: 'joining_date',
      label: 'Join Date',
      sortable: true,
      render: (value: string) => (
        <span className="whitespace-nowrap text-gray-300">
          {new Date(value).toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: '2-digit'
          })}
        </span>
      )
    },
    {
      key: 'manager',
      label: 'Manager',
      sortable: true,
      render: (value: any, row: DepartmentEmployee) => (
        <span className="text-gray-300">{getManagerName(row)}</span>
      )
    },
    {
      key: 'attendance_percentage',
      label: 'Att Percentage',
      sortable: true,
      render: (value: number) => (
        <div className="flex items-center gap-2">
          <div className="w-16 bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${
                value >= 90 ? 'bg-green-500' : 
                value >= 75 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${value}%` }}
            />
          </div>
          <span className={`text-sm font-medium ${
            value >= 90 ? 'text-green-400' : 
            value >= 75 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {value}%
          </span>
        </div>
      )
    },
  ];

  const handleBack = () => {
    router.push('/admin/departments');
  };

  const handleRetry = () => {
    fetchDepartmentDetails();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#171717] flex items-center justify-center">
        <div className="text-white text-lg">Loading department details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#171717] flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">Error Loading Department</div>
          <div className="text-gray-400 mb-6">{error}</div>
          <div className="flex gap-4 justify-center">
            <Button
              onClick={handleBack}
              variant="outline"
              className="text-gray-400 border-gray-600 hover:text-white hover:bg-gray-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Departments
            </Button>
            <Button
              onClick={handleRetry}
              className="bg-[#ff9d00] hover:bg-[#e68e00] text-black"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!department) {
    return (
      <div className="min-h-screen bg-[#171717] flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-lg mb-4">Department not found</div>
          <Button
            onClick={handleBack}
            variant="outline"
            className="text-gray-400 border-gray-600 hover:text-white hover:bg-gray-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Departments
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#171717] p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Back Button */}
        <Button
          onClick={handleBack}
          variant="ghost"
          className="mb-6 text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Departments
        </Button>

        {/* Section Header */}
        <SectionHeader
          title={`Details | ${department.name}`}
          description={`${department.name} created ${new Date(department.created_at).toLocaleDateString()} & managing ${filteredEmployees.length} employees. ${department.hod_name && department.hod_name !== 'Not Assigned' ? `Managed by ${department.hod_name}` : ''}`}
          actions={
            <div className="flex flex-col sm:flex-row gap-4 items-center w-full sm:w-auto">
              <div className="relative flex-1 w-full sm:w-64">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-[#1a1a1a] border-[#333333] text-white placeholder-gray-400"
                />
              </div>
            </div>
          }
        />

        {/* Employees Table */}
        <div className="mt-6">
          <DataTable
            columns={columns}
            data={filteredEmployees}
            loading={loading}
            emptyMessage={
              searchTerm 
                ? "No employees found matching your search"
                : "No employees found in this department"
            }
          />
        </div>
      </div>
    </div>
  );
}