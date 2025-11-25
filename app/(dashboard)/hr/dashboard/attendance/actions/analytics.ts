// app/hr/attendance/actions/analytics.ts
'use server';

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function getAttendanceStatusBreakdown(date: string) {
  if (!date) {
    console.error('No date provided for attendance status breakdown');
    return [];
  }

  try {
    const { data, error } = await supabaseAdmin
      .rpc('get_attendance_status_breakdown', { 
        target_date: date 
      });

    if (error) {
      console.error('Error fetching attendance status breakdown:', error);
      return [];
    }

    // Transform the data to match our interface
    return (data || []).map((item: any) => ({
      status: item.status_type,
      count: item.employee_count,
      percentage: item.percentage_value
    }));
  } catch (error) {
    console.error('Exception in getAttendanceStatusBreakdown:', error);
    return [];
  }
}

export async function getDepartmentAttendance(month: string, year: string) {
  if (!month || !year) {
    console.error('Month or year not provided for department attendance');
    return [];
  }

  try {
    // Convert to integers to match the integer function signature
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (isNaN(monthNum) || isNaN(yearNum)) {
      console.error('Invalid month or year format');
      return [];
    }

    const { data, error } = await supabaseAdmin
      .rpc('get_department_attendance', { 
        target_month: monthNum, 
        target_year: yearNum 
      });

    if (error) {
      console.error('Error fetching department attendance:', error);
      
      // Fallback: Try direct SQL query if function fails
      return await getDepartmentAttendanceFallback(monthNum, yearNum);
    }

    // Return empty array if no data
    if (!data || data.length === 0) {
      return await getDepartmentAttendanceFallback(monthNum, yearNum);
    }

    // Transform the data to match our interface
    return data.map((item: any) => ({
      department: item.department_name,
      attendance_percentage: item.attendance_percentage,
      total_employees: item.total_employees_count,
      present_count: item.present_employees_count
    }));
  } catch (error) {
    console.error('Exception in getDepartmentAttendance:', error);
    return await getDepartmentAttendanceFallback(parseInt(month, 10), parseInt(year, 10));
  }
}

// Fallback function using direct SQL query
async function getDepartmentAttendanceFallback(month: number, year: number) {
  try {
    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of the month
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Get all departments
    const { data: departments, error: deptError } = await supabaseAdmin
      .from('departments')
      .select('id, name')
      .eq('status', 'active');

    if (deptError) {
      console.error('Error fetching departments:', deptError);
      return [];
    }

    const departmentStats = [];

    for (const dept of departments) {
      // Get employees in this department
      const { data: employees, error: empError } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('department_id', dept.id)
        .eq('status', 'active');

      if (empError) {
        console.error(`Error fetching employees for department ${dept.name}:`, empError);
        continue;
      }

      const employeeIds = employees.map(emp => emp.id);
      const totalEmployees = employeeIds.length;

      if (totalEmployees === 0) {
        departmentStats.push({
          department: dept.name,
          attendance_percentage: 0,
          total_employees: 0,
          present_count: 0
        });
        continue;
      }

      // Get present count for this department in the month
      const { data: attendance, error: attError } = await supabaseAdmin
        .from('attendance')
        .select('employee_id, date, status')
        .in('employee_id', employeeIds)
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .in('status', ['present', 'late', 'half_day']);

      if (attError) {
        console.error(`Error fetching attendance for department ${dept.name}:`, attError);
        continue;
      }

      // Calculate unique present employees per day and average
      const workingDays = getWorkingDays(month, year);
      const maxPossibleAttendances = totalEmployees * workingDays;
      
      if (maxPossibleAttendances === 0) {
        departmentStats.push({
          department: dept.name,
          attendance_percentage: 0,
          total_employees: totalEmployees,
          present_count: 0
        });
        continue;
      }

      const presentCount = attendance?.length || 0;
      const attendancePercentage = Math.round((presentCount / maxPossibleAttendances) * 100);

      departmentStats.push({
        department: dept.name,
        attendance_percentage: attendancePercentage,
        total_employees: totalEmployees,
        present_count: presentCount
      });
    }

    return departmentStats;
  } catch (error) {
    console.error('Error in department attendance fallback:', error);
    return [];
  }
}

// Helper function to calculate working days in a month
function getWorkingDays(month: number, year: number): number {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  let workingDays = 0;
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    // Count only weekdays (Monday to Friday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return workingDays;
}