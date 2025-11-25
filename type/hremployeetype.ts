// types/employeeTypes.ts
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

export interface EmployeeTypeDistribution {
  type: string;
  count: number;
  percentage: number;
}

export interface ProfileCompletionData {
  status: 'complete' | 'partial' | 'incomplete';
  count: number;
  percentage: number;
  color: string;
}