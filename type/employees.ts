export interface Employee {
  id: string;
  clerk_user_id: string;
  email: string;
  full_name: string;
  department_id: string;
  role_id: string;
  manager_id: string;
  status: 'active' | 'inactive';
  join_date: string;
  phone?: string;
  address?: string;
  type: string;
  first_name: string;
  last_name: string;
  department?: {
    id: string;
    name: string;
  };
  role_name?: string;
  manager?: {
    id: string;
    full_name: string;
  };
}

export interface EmployeeFormData {
  first_name: string;
  last_name: string;
  email: string;
  department_id: string;
  role_id: string;
  manager_id: string;
  status: 'active' | 'inactive';
  join_date: string;
  phone: string;
  address: string;
  type: string;
}