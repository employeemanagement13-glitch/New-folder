// lib/employee-data.ts
import { supabaseAdmin } from "../supabaseAdmin";

export interface Employee {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  department_id: string;
  department_name: string;
  role_id: string;
  role_name: string;
  manager_id: string | null;
  joining_date: string;
  status: 'active' | 'inactive' | 'probation' | 'resigned' | 'on_leave';
  employment_type: 'full_time' | 'contract' | 'intern';
  phone?: string;
  address?: string;
  created_at: string;
}

export interface CreateEmployeeData {
  name: string;
  email: string;
  employee_id: string;
  department_id: string;
  role_id: string;
  joining_date: string;
  employment_type: 'full_time' | 'contract' | 'intern';
  phone?: string;
  address?: string;
}

// Check if department already has a manager
export async function checkDepartmentHasManager(departmentId: string): Promise<{ hasManager: boolean; managerName?: string }> {
  try {
    const { data: department, error } = await supabaseAdmin
      .from('departments')
      .select('manager_id, employees!manager_id(name)')
      .eq('id', departmentId)
      .single();

    if (error) {
      console.error('Error checking department manager:', error);
      return { hasManager: false };
    }

    const hasManager = !!department?.manager_id;
    const managerName = department?.employees?.name;

    return { hasManager, managerName };
  } catch (error) {
    console.error('Error checking department manager:', error);
    return { hasManager: false };
  }
}

// Get Department Manager role ID
export async function getDepartmentManagerRoleId(): Promise<string | null> {
  try {
    const { data: role, error } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('role_name', 'Department Manager')
      .single();

    if (error) {
      console.error('Error fetching Department Manager role:', error);
      return null;
    }

    return role?.id || null;
  } catch (error) {
    console.error('Error fetching Department Manager role:', error);
    return null;
  }
}

// Fetch all employees with proper joins
export async function fetchEmployees(filters?: {
  search?: string;
  department?: string;
  date?: string;
}): Promise<Employee[]> {
  try {
    console.log('🔍 Fetching employees with filters:', filters);
    
    let query = supabaseAdmin
      .from('employees')
      .select(`
        *,
        departments!department_id (name),
        roles!role_id (role_name)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    // Apply search filter
    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,employee_id.ilike.%${filters.search}%`);
    }

    // Apply department filter
    if (filters?.department) {
      // First get the department ID from name
      const { data: department } = await supabaseAdmin
        .from('departments')
        .select('id')
        .eq('name', filters.department)
        .eq('status', 'active')
        .single();

      if (department) {
        query = query.eq('department_id', department.id);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching employees:', error);
      return [];
    }

    console.log('✅ Raw employee data:', data);

    if (!data) return [];

    // Transform the data with proper field mapping
    const transformedData = data.map(emp => ({
      id: emp.id,
      employee_id: emp.employee_id,
      name: emp.name,
      email: emp.email,
      department_id: emp.department_id,
      department_name: emp.departments?.name || 'Unknown',
      role_id: emp.role_id,
      role_name: emp.roles?.role_name || 'Unknown',
      manager_id: emp.manager_id,
      joining_date: emp.joining_date,
      status: emp.status,
      employment_type: emp.employment_type,
      phone: emp.phone,
      address: emp.address,
      created_at: emp.created_at
    }));

    console.log('✅ Transformed employee data:', transformedData);
    return transformedData;

  } catch (error) {
    console.error('❌ Unexpected error fetching employees:', error);
    return [];
  }
}

// Fetch departments for filters
export async function fetchDepartments(): Promise<{ id: string; name: string; has_manager?: boolean }[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('departments')
      .select('id, name, manager_id')
      .eq('status', 'active')
      .order('name');

    if (error) {
      console.error('Error fetching departments:', error);
      return [];
    }

    // Add has_manager flag
    const departmentsWithManagerFlag = data?.map(dept => ({
      id: dept.id,
      name: dept.name,
      has_manager: !!dept.manager_id
    })) || [];

    console.log('✅ Departments fetched:', departmentsWithManagerFlag);
    return departmentsWithManagerFlag;
  } catch (error) {
    console.error('Error fetching departments:', error);
    return [];
  }
}

// Fetch roles for employee creation
export async function fetchRoles(departmentId?: string): Promise<{ id: string; role_name: string; disabled?: boolean }[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('roles')
      .select('id, role_name')
      .order('role_name');

    if (error) {
      console.error('Error fetching roles:', error);
      return [];
    }

    // If department ID is provided, check if we need to disable Department Manager role
    if (departmentId) {
      const departmentManagerRoleId = await getDepartmentManagerRoleId();
      const { hasManager } = await checkDepartmentHasManager(departmentId);

      const rolesWithDisabledFlag = data?.map(role => ({
        id: role.id,
        role_name: role.role_name,
        disabled: role.id === departmentManagerRoleId && hasManager
      })) || [];

      console.log('✅ Roles with disabled flag:', rolesWithDisabledFlag);
      return rolesWithDisabledFlag;
    }

    console.log('✅ Roles fetched:', data);
    return data || [];
  } catch (error) {
    console.error('Error fetching roles:', error);
    return [];
  }
}

// Create new employee with manager validation
export async function createEmployee(employeeData: CreateEmployeeData): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🚀 Creating employee with data:', employeeData);

    // Validate: Check if trying to assign Department Manager to a department that already has one
    const departmentManagerRoleId = await getDepartmentManagerRoleId();
    if (employeeData.role_id === departmentManagerRoleId) {
      const { hasManager, managerName } = await checkDepartmentHasManager(employeeData.department_id);
      
      if (hasManager) {
        return { 
          success: false, 
          error: `Cannot assign Department Manager role. Department already has a manager (${managerName || 'Unknown'}).` 
        };
      }
    }

    const { data, error } = await supabaseAdmin
      .from('employees')
      .insert([{
        ...employeeData,
        status: 'active',
        clerk_user_id: `temp_${Date.now()}`,
        manager_id: null // No manager by default
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating employee:', error);
      return { success: false, error: error.message };
    }

    // If this is a Department Manager, update the department's manager_id
    if (employeeData.role_id === departmentManagerRoleId && data) {
      const { error: updateError } = await supabaseAdmin
        .from('departments')
        .update({ manager_id: data.id })
        .eq('id', employeeData.department_id);

      if (updateError) {
        console.error('❌ Error updating department manager:', updateError);
        // Don't fail the entire operation, just log the error
      } else {
        console.log('✅ Department manager updated successfully');
      }
    }

    console.log('✅ Employee created successfully:', data);
    return { success: true };
  } catch (error) {
    console.error('❌ Unexpected error creating employee:', error);
    return { success: false, error: 'Failed to create employee' };
  }
}

// Update employee with manager validation
export async function updateEmployee(
  employeeId: string, 
  updates: Partial<CreateEmployeeData>
): Promise<{ success: boolean; error?: string }> {
  try {
    // If role is being changed to Department Manager, validate
    if (updates.role_id) {
      const departmentManagerRoleId = await getDepartmentManagerRoleId();
      if (updates.role_id === departmentManagerRoleId && updates.department_id) {
        const { hasManager, managerName } = await checkDepartmentHasManager(updates.department_id);
        
        if (hasManager) {
          return { 
            success: false, 
            error: `Cannot assign Department Manager role. Department already has a manager (${managerName || 'Unknown'}).` 
          };
        }
      }
    }

    const { error } = await supabaseAdmin
      .from('employees')
      .update(updates)
      .eq('id', employeeId);

    if (error) {
      console.error('Error updating employee:', error);
      return { success: false, error: error.message };
    }

    // If this is a Department Manager, update the department's manager_id
    if (updates.role_id && updates.department_id) {
      const departmentManagerRoleId = await getDepartmentManagerRoleId();
      if (updates.role_id === departmentManagerRoleId) {
        const { error: updateError } = await supabaseAdmin
          .from('departments')
          .update({ manager_id: employeeId })
          .eq('id', updates.department_id);

        if (updateError) {
          console.error('❌ Error updating department manager:', updateError);
        } else {
          console.log('✅ Department manager updated successfully');
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating employee:', error);
    return { success: false, error: 'Failed to update employee' };
  }
}

// Delete employee (soft delete)
export async function deleteEmployee(employeeId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from('employees')
      .delete()
      .eq('id', employeeId);

    if (error) {
      console.error('Error deleting employee:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting employee:', error);
    return { success: false, error: 'Failed to delete employee' };
  }
}