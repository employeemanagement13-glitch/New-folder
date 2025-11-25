export interface TeamMember {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  department_id: string;
  role_id: string;
  joining_date: string;
  phone?: string;
  employment_type?: string;
  status?: string;
  department?: {
    name: string;
  };
  role?: {
    role_name: string;
  };
  attendance_percentage?: number;
  pending_leaves?: number;
}

export interface AttendanceTrend {
  date: string;
  present_count: number;
  total_employees: number;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: string;
  total_days: number;
}

export interface ManagerData {
  id: string;
  name: string;
  department_id: string;
  department?: {
    name: string;
  };
}