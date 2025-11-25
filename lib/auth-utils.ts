// lib/auth-utils.ts
import { supabaseAdmin } from './supabaseAdmin';

export interface UserRoleData {
  role: 'admin' | 'hr' | 'manager' | 'employee';
  employeeId?: string;
  userId?: string;
  name?: string;
  email?: string;
}

// Main function to detect user role from Supabase tables
export async function getUserRoleData(clerkUserId: string, userEmail?: string): Promise<UserRoleData> {
  try {
    console.log('🔍 Detecting role for:', { clerkUserId, userEmail });

    // 1. Check admins table first (email-based verification)
    if (userEmail) {
      const { data: admin, error: adminError } = await supabaseAdmin
        .from('admins')
        .select('*')
        .eq('email', userEmail)
        .single();

      if (!adminError && admin) {
        console.log('✅ User is Admin');
        return {
          role: 'admin',
          userId: admin.id,
          name: admin.name,
          email: admin.email
        };
      }
    }

    // 2. Check hrs table
    const { data: hr, error: hrError } = await supabaseAdmin
      .from('hrs')
      .select(`
        *,
        employees!hrs_employee_id_fkey (
          id,
          email,
          employee_id,
          clerk_user_id
        )
      `)
      .eq('email', userEmail)
      // .eq('is_active', true)
      .single();

    if (!hrError && hr) {
      console.log('✅ User is HR Manager');
      return {
        role: 'hr',
        employeeId: hr.employee_id,
        userId: hr.id,
        name: hr.employees?.name,
        email: hr.employees?.email
      };
    }

    // 3. Check managers table
    const { data: manager, error: managerError } = await supabaseAdmin
      .from('managers')
      .select(`
        *,
        employees!managers_employee_id_fkey (
          id,
          name,
          email,
          employee_id,
          department_id,
          role_id
        )
      `)
      .eq('clerk_user_id', clerkUserId)
      .eq('is_active', true)
      .single();

    if (!managerError && manager) {
      console.log('✅ User is Manager');
      return {
        role: 'manager',
        employeeId: manager.employee_id,
        userId: manager.id,
        name: manager.employees?.name,
        email: manager.employees?.email
      };
    }

    // 4. Check team_leads table
    // const { data: teamLead, error: teamLeadError } = await supabaseAdmin
    //   .from('team_leads')
    //   .select(`
    //     *,
    //     employees!team_leads_employee_id_fkey (
    //       id,
    //       name,
    //       email,
    //       employee_id,
    //       department_id,
    //       role_id
    //     )
    //   `)
    //   .eq('clerk_user_id', clerkUserId)
    //   .eq('is_active', true)
    //   .single();

    // if (!teamLeadError && teamLead) {
    //   console.log('✅ User is Manager (Team Lead)');
    //   return {
    //     role: 'manager',
    //     employeeId: teamLead.employee_id,
    //     userId: teamLead.id,
    //     name: teamLead.employees?.name,
    //     email: teamLead.employees?.email
    //   };
    // }

    // 5. Check employees table and determine role from roles table
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select(`
        *,
        roles!employees_role_id_fkey (
          role_name
        ),
        departments!employees_department_id_fkey (
          name
        )
      `)
      .eq('clerk_user_id', clerkUserId)
      .eq('status', 'active')
      .single();

    if (!employeeError && employee) {
      const roleName = employee.roles?.role_name?.toLowerCase();
      
      // Determine role based on role_name from roles table
      let role: 'admin' | 'hr' | 'manager' | 'employee' = 'employee';
      
      if (roleName?.includes('admin')) {
        role = 'admin';
      } else if (roleName?.includes('hr')) {
        role = 'hr';
      } else if (roleName?.includes('manager') || roleName?.includes('team lead')) {
        role = 'manager';
      }

      console.log('✅ User is Employee with role:', role);
      return {
        role,
        employeeId: employee.id,
        userId: employee.id,
        name: employee.name,
        email: employee.email
      };
    }

    // 6. Fallback - check employees table by email
    if (userEmail) {
      const { data: employeeByEmail, error: emailError } = await supabaseAdmin
        .from('employees')
        .select(`
          *,
          roles!employees_role_id_fkey (
            role_name
          )
        `)
        .eq('email', userEmail)
        .eq('status', 'active')
        .single();

      if (!emailError && employeeByEmail) {
        const roleName = employeeByEmail.roles?.role_name?.toLowerCase();
        let role: 'admin' | 'hr' | 'manager' | 'employee' = 'employee';
        
        if (roleName?.includes('admin')) {
          role = 'admin';
        } else if (roleName?.includes('hr')) {
          role = 'hr';
        } else if (roleName?.includes('manager') || roleName?.includes('team lead')) {
          role = 'manager';
        }

        console.log('✅ User found by email with role:', role);
        return {
          role,
          employeeId: employeeByEmail.id,
          userId: employeeByEmail.id,
          name: employeeByEmail.name,
          email: employeeByEmail.email
        };
      }
    }

    console.log('❌ User not found in any role table, defaulting to employee');
    return { role: 'employee' };

  } catch (error) {
    console.error('❌ Error detecting user role:', error);
    return { role: 'employee' };
  }
}

// Legacy function for backward compatibility
export async function getUserRole(clerkUserId: string): Promise<'admin' | 'hr' | 'manager' | 'employee'> {
  const roleData = await getUserRoleData(clerkUserId);
  return roleData.role;
}

export async function getEmployeeId(clerkUserId: string): Promise<string> {
  const roleData = await getUserRoleData(clerkUserId);
  if (roleData.employeeId) {
    return roleData.employeeId;
  }
  throw new Error('Employee ID not found');
}