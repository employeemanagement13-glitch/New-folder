export interface Employee {
  id: string;
  clerk_user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  department_id: string;
  role_id: string;
  manager_id: string | null;
  status: 'active' | 'inactive' | 'on_leave';
  join_date: string;
  phone: string | null;
  address: string | null;
  type: 'Full Time' | 'Contract' | 'Intern';
  created_at: string;
  updated_at: string;
  department?: {
    id: string;
    name: string;
  };
  manager?: {
    first_name: string;
    last_name: string;
    full_name: string;
  };
}

export interface EmployeeTableProps {
  employees: Employee[];
  onEdit: (employee: Employee) => void;
  onDelete: (employeeId: string) => void;
  onResetPassword: (employeeId: string) => void;
}

export default function EmployeeTable({
  employees,
  onEdit,
  onDelete,
  onResetPassword,
}: EmployeeTableProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit'
    });
  };

  const getStatusDisplay = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'active': 'Present',
      'inactive': 'Absent',
      'on_leave': 'On Leave'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      'active': 'text-green-400 bg-green-900/30',
      'inactive': 'text-red-400 bg-red-900/30',
      'on_leave': 'text-yellow-400 bg-yellow-900/30'
    };
    return colorMap[status] || 'text-gray-400 bg-gray-900/30';
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-[#333333]">
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Emp ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Emp Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Email
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Department
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Role
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Join Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Manager
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#333333]">
          {employees.map((employee) => (
            <tr key={employee.id} className="text-sm text-white hover:bg-[#1a1a1a] transition-colors">
              <td className="px-6 py-4 whitespace-nowrap font-medium">
                {employee.clerk_user_id}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {employee.first_name} {employee.last_name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {employee.email}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {employee.department?.name || 'No Department'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {employee.role_id}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {formatDate(employee.join_date)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {employee.manager?.full_name || 'No Manager'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(employee.status)}`}>
                  {getStatusDisplay(employee.status)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex space-x-3">
                  <button
                    onClick={() => onEdit(employee)}
                    className="text-blue-400 hover:text-blue-300 font-medium text-sm"
                  >
                    Edit
                  </button>
                  <span className="text-[#333333]">/</span>
                  <button
                    onClick={() => onDelete(employee.id)}
                    className="text-red-400 hover:text-red-300 font-medium text-sm"
                  >
                    Delete
                  </button>
                  <span className="text-[#333333]">/</span>
                  <button
                    onClick={() => onResetPassword(employee.id)}
                    className="text-green-400 hover:text-green-300 font-medium text-sm"
                  >
                    Reset Password
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {employees.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          No employees found
        </div>
      )}
    </div>
  );
}