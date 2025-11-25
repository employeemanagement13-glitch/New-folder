// types/attendance.ts
export interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  department: string;
  check_in: string | null;
  check_out: string | null;
  date: string;
  total_hours: number | null;
  status: 'present' | 'absent' | 'late' | 'half_day' | 'leave' | 'holiday' | 'weekoff';
  regularized: boolean;
}

export interface AttendanceTrend {
  date: string;
  percentage: number;
}

export interface AttendanceStatus {
  status: string;
  count: number;
  percentage: number;
}

export interface DepartmentAttendance {
  department: string;
  attendance_percentage: number;
  total_employees: number;
  present_count: number;
}

export interface AttendanceFilters {
  date?: string;
  employee_id?: string;
  department?: string;
  status?: string;
  month?: string;
  year?: string;
}