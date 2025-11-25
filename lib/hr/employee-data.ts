// lib/hr/employee-data.ts
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export interface Employee {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  department_id: string;
  role_id: string;
  manager_id?: string;
  status: 'active' | 'inactive' | 'probation' | 'resigned' | 'on_leave';
  employment_type: 'full_time' | 'contract' | 'intern';
  joining_date: string;
  created_at: string;
  updated_at: string;
  department_name?: string;
  role_name?: string;
}

export const fetchEmployees = async (filters?: {
  department?: string;
  status?: string;
  employment_type?: string;
}): Promise<Employee[]> => {
  try {
    console.log('🔄 Fetching employees with filters:', filters);

    let query = supabaseAdmin
      .from('employees')
      .select(`
        id,
        employee_id,
        name,
        email,
        phone,
        address,
        department_id,
        role_id,
        manager_id,
        status,
        employment_type,
        joining_date,
        created_at,
        updated_at,
        departments!employees_department_id_fkey(id, name),
        roles(id, role_name)
      `);

    // Apply filters
    if (filters?.department) {
      query = query.eq('departments.name', filters.department);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.employment_type) {
      query = query.eq('employment_type', filters.employment_type);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching employees:', error);
      throw error;
    }

    console.log('✅ Employees fetched successfully:', data?.length);

    // Transform the data to match our interface
    const transformedData: Employee[] = (data || []).map(emp => ({
      ...emp,
      department_name: emp.departments?.name,
      role_name: emp.roles?.role_name
    }));

    return transformedData;

  } catch (error) {
    console.error('❌ Error in fetchEmployees:', error);
    return [];
  }
};

export const fetchDepartments = async (): Promise<{ id: string; name: string }[]> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('departments')
      .select('id, name')
      .eq('status', 'active')
      .order('name');

    if (error) {
      console.error('Error fetching departments:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchDepartments:', error);
    return [];
  }
};

export const fetchRoles = async (): Promise<{ id: string; role_name: string }[]> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('roles')
      .select('id, role_name')
      .order('role_name');

    if (error) {
      console.error('Error fetching roles:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchRoles:', error);
    return [];
  }
};