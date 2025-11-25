// lib/attendance-data.ts
import { supabaseAdmin } from "../supabaseAdmin";

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  department_name: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  total_hours: number | null;
  status: 'present' | 'absent' | 'late' | 'half_day' | 'leave' | 'holiday' | 'weekoff';
  regularized: boolean;
}

export interface AttendanceStats {
  totalEmployees: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  attendanceRate: number;
}

export interface AttendanceChartData {
  date: string;
  attendance_rate: number;
  present_count: number;
  total_count: number;
}

// Fetch attendance records with proper joins
export async function fetchAttendanceRecords(filters?: {
  department?: string;
  date?: string;
}): Promise<AttendanceRecord[]> {
  try {
    // First, get all employees
    const { data: employees, error: employeesError } = await supabaseAdmin
      .from('employees')
      .select(`
        id, 
        name, 
        employee_id, 
        department_id
      `)
      .eq('status', 'active');

    if (employeesError) {
      console.error('Error fetching employees:', employeesError);
      throw employeesError;
    }

    // Get all departments
    const { data: departments, error: deptError } = await supabaseAdmin
      .from('departments')
      .select('id, name')
      .eq('status', 'active');

    if (deptError) {
      console.error('Error fetching departments:', deptError);
      throw deptError;
    }

    // Then get attendance records
    let query = supabaseAdmin
      .from('attendance')
      .select('*')
      .order('date', { ascending: false });

    if (filters?.date) {
      query = query.eq('date', filters.date);
    }

    const { data: attendance, error: attendanceError } = await query;
    if (attendanceError) {
      console.error('Error fetching attendance:', attendanceError);
      throw attendanceError;
    }

    if (!attendance || !employees || !departments) return [];

    // Create a map for quick department lookup
    const departmentMap = new Map();
    departments.forEach(dept => {
      departmentMap.set(dept.id, dept.name);
    });

    // Create a map for employee details
    const employeeMap = new Map();
    employees.forEach(emp => {
      employeeMap.set(emp.id, {
        name: emp.name,
        employee_id: emp.employee_id,
        department_name: departmentMap.get(emp.department_id) || 'Unknown'
      });
    });

    // Combine the data
    const combinedData = attendance.map(record => {
      const employee = employeeMap.get(record.employee_id);
      
      if (!employee) {
        return null; // Skip records without employee data
      }

      // Apply department filter if specified
      if (filters?.department && employee.department_name !== filters.department) {
        return null;
      }

      return {
        id: record.id,
        employee_id: record.employee_id,
        employee_name: employee.name,
        employee_code: employee.employee_id,
        department_name: employee.department_name,
        date: record.date,
        check_in: record.check_in,
        check_out: record.check_out,
        total_hours: record.total_hours,
        status: record.status as any,
        regularized: record.regularized
      };
    }).filter(Boolean) as AttendanceRecord[];

    return combinedData;
  } catch (error) {
    console.error('Error in fetchAttendanceRecords:', error);
    return [];
  }
}

// Fetch attendance statistics
export async function fetchAttendanceStats(department?: string, date?: string): Promise<AttendanceStats> {
  try {
    const records = await fetchAttendanceRecords({ department, date });
    
    const totalEmployees = new Set(records.map(record => record.employee_id)).size;
    const presentCount = records.filter(record => record.status === 'present').length;
    const absentCount = records.filter(record => record.status === 'absent').length;
    const lateCount = records.filter(record => record.status === 'late').length;
    const attendanceRate = totalEmployees > 0 ? (presentCount / totalEmployees) * 100 : 0;

    return {
      totalEmployees,
      presentCount,
      absentCount,
      lateCount,
      attendanceRate: Math.round(attendanceRate)
    };
  } catch (error) {
    console.error('Error in fetchAttendanceStats:', error);
    return {
      totalEmployees: 0,
      presentCount: 0,
      absentCount: 0,
      lateCount: 0,
      attendanceRate: 0
    };
  }
}

// Fetch chart data for attendance trends
export async function fetchAttendanceChartData(days: number = 30): Promise<AttendanceChartData[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const { data, error } = await supabaseAdmin
      .from('attendance')
      .select('date, status')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching chart data:', error);
      return [];
    }

    if (!data) return [];

    // Group by date and calculate rates
    const dailyData: { [key: string]: { present: number; total: number } } = {};

    data.forEach(record => {
      if (!dailyData[record.date]) {
        dailyData[record.date] = { present: 0, total: 0 };
      }
      
      dailyData[record.date].total++;
      if (record.status === 'present') {
        dailyData[record.date].present++;
      }
    });

    // Convert to chart format
    return Object.entries(dailyData)
      .map(([date, stats]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        attendance_rate: stats.total > 0 ? (stats.present / stats.total) * 100 : 0,
        present_count: stats.present,
        total_count: stats.total
      }))
      .slice(-15); // Last 15 days
  } catch (error) {
    console.error('Error in fetchAttendanceChartData:', error);
    return [];
  }
}

// Fetch all departments for filters
export async function fetchDepartments(): Promise<{ id: string; name: string }[]> {
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
}