'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function getLeaveRecords(filters: any = {}) {
  try {
    console.log('Fetching leave records with filters:', filters);

    let query = supabaseAdmin
      .from('leave_requests')
      .select(`
        id,
        employee_id,
        start_date,
        end_date,
        total_days,
        reason,
        status,
        remarks,
        created_at,
        requested_at,
        employees!leave_requests_employee_id_fkey (
          employee_id,
          name,
          departments!employees_department_id_fkey (
            name
          )
        ),
        leave_types!leave_requests_leave_type_id_fkey (
          name
        )
      `);

    // Apply filters
    if (filters.department && filters.department !== '') {
      query = query.eq('employees.departments.name', filters.department);
    }

    if (filters.status && filters.status !== '') {
      query = query.eq('status', filters.status);
    }

    if (filters.employee_search && filters.employee_search !== '') {
      // query = query.or(`employees.employee_id.ilike.%${filters.employee_search}%,employees.name.ilike.%${filters.employee_search}%`);
      query = query.eq('employees.name', filters.employee_search)
    }

    if (filters.date && filters.date !== '') {
      query = query.eq('start_date', filters.date);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching leave records:', error);
      return [];
    }

    console.log('Raw leave data:', data);

    // Transform data to match our interface
    const transformedData = data.map(record => ({
      id: record.id,
      employee_id: record.employees?.employee_id || 'N/A',
      employee_name: record.employees?.name || 'Unknown Employee',
      department: record.employees?.departments?.name || 'No Department',
      leave_type: record.leave_types?.name || 'Unknown Type',
      start_date: record.start_date,
      end_date: record.end_date,
      total_days: record.total_days,
      applied_date: record.requested_at || record.created_at,
      status: record.status,
      remarks: record.remarks,
      reason: record.reason
    }));

    console.log('Transformed leave data:', transformedData);
    return transformedData;

  } catch (error) {
    console.error('Error in getLeaveRecords:', error);
    return [];
  }
}

export async function getLeaveReports(filters: any = {}) {
  try {
    console.log('Fetching leave reports with filters:', filters);

    // Get current month and year for default reporting
    const currentDate = new Date();
    const targetMonth = filters.month_year 
      ? new Date(filters.month_year + '-01') 
      : new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    
    const nextMonth = new Date(targetMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    let query = supabaseAdmin
      .from('leave_requests')
      .select(`
        status,
        start_date,
        employees!leave_requests_employee_id_fkey (
          departments!employees_department_id_fkey (
            name
          )
        )
      `)
      .gte('start_date', targetMonth.toISOString().split('T')[0])
      .lt('start_date', nextMonth.toISOString().split('T')[0]);

    if (filters.department && filters.department !== '') {
      query = query.eq('employees.departments.name', filters.department);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching leave reports:', error);
      return [];
    }

    console.log('Raw report data:', data);

    // Group by department and status
    const departmentStats: { [key: string]: { total: number, pending: number, approved: number, rejected: number } } = {};

    data.forEach(record => {
      const deptName = record.employees?.departments?.name || 'No Department';
      
      if (!departmentStats[deptName]) {
        departmentStats[deptName] = { total: 0, pending: 0, approved: 0, rejected: 0 };
      }

      departmentStats[deptName].total++;
      
      switch (record.status) {
        case 'pending':
          departmentStats[deptName].pending++;
          break;
        case 'approved':
          departmentStats[deptName].approved++;
          break;
        case 'rejected':
          departmentStats[deptName].rejected++;
          break;
      }
    });

    // Transform to LeaveReport format
    const reports = Object.entries(departmentStats).map(([department, stats]) => ({
      department,
      month: targetMonth.toLocaleString('default', { month: 'long', year: 'numeric' }),
      total_leaves: stats.total,
      pending: stats.pending,
      approved: stats.approved,
      rejected: stats.rejected
    }));

    console.log('Transformed report data:', reports);
    return reports;

  } catch (error) {
    console.error('Error in getLeaveReports:', error);
    return [];
  }
}

export async function updateLeaveStatus(leaveId: string, status: 'approved' | 'rejected', remarks?: string) {
  try {
    console.log('Updating leave status:', { leaveId, status, remarks });

    const { data, error } = await supabaseAdmin
      .from('leave_requests')
      .update({
        status,
        remarks: remarks || `Leave ${status} by HR`,
        updated_at: new Date().toISOString()
      })
      .eq('id', leaveId)
      .select();

    if (error) {
      console.error('Error updating leave status:', error);
      throw error;
    }

    console.log('Successfully updated leave status:', data);
    return data;

  } catch (error) {
    console.error('Error in updateLeaveStatus:', error);
    throw error;
  }
}

export async function getDepartments() {
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

    return data;
  } catch (error) {
    console.error('Error in getDepartments:', error);
    return [];
  }
}

export async function getLeaveTypes() {
  try {
    const { data, error } = await supabaseAdmin
      .from('leave_types')
      .select('id, name')
      .eq('status', 'active')
      .order('name');

    if (error) {
      console.error('Error fetching leave types:', error);
      return [];
    }

    return data;
  } catch (error) {
    console.error('Error in getLeaveTypes:', error);
    return [];
  }
}