// app/hr/attendance/actions/attendance.ts
'use server';

// import { createClient } from '@/lib/supabase/server';
import { AttendanceRecord, AttendanceFilters } from '@/type/hrattendance';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function getAttendanceRecords(filters: AttendanceFilters = {}) {
  // const supabase = await createClient();
  
  // First get the base attendance records with employee data
  let query = supabaseAdmin
    .from('attendance')
    .select(`
      *,
      employees!attendance_employee_id_fkey (
        employee_id,
        name,
        department_id
      )
    `);

  // Apply filters
  if (filters.date) {
    query = query.eq('date', filters.date);
  }
  
  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const { data: attendanceData, error } = await query.order('date', { ascending: false });

  if (error) {
    console.error('Error fetching attendance records:', error);
    return [];
  }

  // Now get department names for each record
  const recordsWithDepartments = await Promise.all(
    attendanceData.map(async (record) => {
      if (record.employees?.department_id) {
        const { data: departmentData } = await supabaseAdmin
          .from('departments')
          .select('name')
          .eq('id', record.employees.department_id)
          .single();

        return {
          id: record.id,
          employee_id: record.employees.employee_id,
          employee_name: record.employees.name,
          department: departmentData?.name || 'No Department',
          check_in: record.check_in,
          check_out: record.check_out,
          date: record.date,
          total_hours: record.total_hours,
          status: record.status,
          regularized: record.regularized
        };
      }
      
      return {
        id: record.id,
        employee_id: record.employees?.employee_id || 'N/A',
        employee_name: record.employees?.name || 'Unknown',
        department: 'No Department',
        check_in: record.check_in,
        check_out: record.check_out,
        date: record.date,
        total_hours: record.total_hours,
        status: record.status,
        regularized: record.regularized
      };
    })
  );

  // Apply additional filters that require department/employee info
  let filteredRecords = recordsWithDepartments;

  if (filters.employee_id) {
    filteredRecords = filteredRecords.filter(record => 
      record.employee_id.toLowerCase().includes(filters.employee_id!.toLowerCase())
    );
  }

  if (filters.department && filters.department !== '') {
    filteredRecords = filteredRecords.filter(record => 
      record.department === filters.department
    );
  }

  return filteredRecords;
}

export async function getAttendanceTrend(period: 'week' | 'month' | 'year' = 'month') {
  // const supabase = await createClient();
  
  const { data, error } = await supabaseAdmin
    .rpc('get_attendance_trend', { period_filter: period });

  if (error) {
    console.error('Error fetching attendance trend:', error);
    return [];
  }

  // Transform the data to match our interface
  return data.map((item: any) => ({
    date: item.trend_date,
    percentage: item.percentage
  }));
}