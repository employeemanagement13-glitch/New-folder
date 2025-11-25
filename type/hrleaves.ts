export interface LeaveRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  department: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  applied_date: string;
  status: 'pending' | 'approved' | 'rejected';
  remarks?: string;
  leave_type_id?: string;
}

export interface LeaveReport {
  department: string;
  month: string;
  total_leaves: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface LeaveFilters {
  department: string;
  date: string;
  status: string;
  employee_search: string;
}

export interface ReportFilters {
  search: string;
  month_year: string;
  department: string;
}