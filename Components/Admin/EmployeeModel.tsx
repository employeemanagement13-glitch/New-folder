import { useState, useEffect } from 'react';

// Use the same interface as in EmployeeTable to avoid TypeScript errors
interface Employee {
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

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onSave: (employeeData: any) => void;
  departments: any[];
  managers: any[];
}

export default function EmployeeModal({
  isOpen,
  onClose,
  employee,
  onSave,
  departments,
  managers,
}: EmployeeModalProps) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    department_id: '',
    role_id: '',
    manager_id: '',
    status: 'active' as 'active' | 'inactive' | 'on_leave',
    join_date: new Date().toISOString().split('T')[0],
    phone: '',
    address: '',
    type: 'Full Time' as 'Full Time' | 'Contract' | 'Intern',
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    if (employee) {
      setFormData({
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email,
        department_id: employee.department_id,
        role_id: employee.role_id,
        manager_id: employee.manager_id || '',
        status: employee.status,
        join_date: employee.join_date,
        phone: employee.phone || '',
        address: employee.address || '',
        type: employee.type,
      });
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        department_id: '',
        role_id: '',
        manager_id: '',
        status: 'active',
        join_date: new Date().toISOString().split('T')[0],
        phone: '',
        address: '',
        type: 'Full Time',
      });
    }
    setErrors({});
  }, [employee, isOpen]);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.department_id) {
      newErrors.department_id = 'Department is required';
    }

    if (!formData.role_id.trim()) {
      newErrors.role_id = 'Role is required';
    }

    if (!formData.join_date) {
      newErrors.join_date = 'Join date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSave(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#111111] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-[#333333]">
        <div className="px-6 py-4 border-b border-[#333333]">
          <h2 className="text-xl font-light text-white">
            {employee ? 'Edit Employee' : 'Add Employee'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                First Name *
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
                className={`w-full px-3 py-2 rounded-lg bg-black border ${
                  errors.first_name ? 'border-red-500' : 'border-[#333333]'
                } text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              />
              {errors.first_name && (
                <p className="text-red-400 text-xs mt-1">{errors.first_name}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
                className={`w-full px-3 py-2 rounded-lg bg-black border ${
                  errors.last_name ? 'border-red-500' : 'border-[#333333]'
                } text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              />
              {errors.last_name && (
                <p className="text-red-400 text-xs mt-1">{errors.last_name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className={`w-full px-3 py-2 rounded-lg bg-black border ${
                  errors.email ? 'border-red-500' : 'border-[#333333]'
                } text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              />
              {errors.email && (
                <p className="text-red-400 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Department *
              </label>
              <select
                name="department_id"
                value={formData.department_id}
                onChange={handleChange}
                required
                className={`w-full px-3 py-2 rounded-lg bg-black border ${
                  errors.department_id ? 'border-red-500' : 'border-[#333333]'
                } text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              >
                <option value="" className="bg-black">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id} className="bg-black">
                    {dept.name}
                  </option>
                ))}
              </select>
              {errors.department_id && (
                <p className="text-red-400 text-xs mt-1">{errors.department_id}</p>
              )}
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Role *
              </label>
              <input
                type="text"
                name="role_id"
                value={formData.role_id}
                onChange={handleChange}
                required
                placeholder="e.g., Developer, Manager, HR Specialist"
                className={`w-full px-3 py-2 rounded-lg bg-black border ${
                  errors.role_id ? 'border-red-500' : 'border-[#333333]'
                } text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              />
              {errors.role_id && (
                <p className="text-red-400 text-xs mt-1">{errors.role_id}</p>
              )}
            </div>

            {/* Manager */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Manager
              </label>
              <select
                name="manager_id"
                value={formData.manager_id}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg bg-black border border-[#333333] text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="" className="bg-black">No Manager</option>
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id} className="bg-black">
                    {manager.first_name} {manager.last_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Status *
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 rounded-lg bg-black border border-[#333333] text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="active" className="bg-black">Active</option>
                <option value="inactive" className="bg-black">Inactive</option>
                <option value="on_leave" className="bg-black">On Leave</option>
              </select>
            </div>

            {/* Employment Type */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Employment Type *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 rounded-lg bg-black border border-[#333333] text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Full Time" className="bg-black">Full Time</option>
                <option value="Contract" className="bg-black">Contract</option>
                <option value="Intern" className="bg-black">Intern</option>
              </select>
            </div>

            {/* Join Date */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Join Date *
              </label>
              <input
                type="date"
                name="join_date"
                value={formData.join_date}
                onChange={handleChange}
                required
                className={`w-full px-3 py-2 rounded-lg bg-black border ${
                  errors.join_date ? 'border-red-500' : 'border-[#333333]'
                } text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              />
              {errors.join_date && (
                <p className="text-red-400 text-xs mt-1">{errors.join_date}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg bg-black border border-[#333333] text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Address
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg bg-black border border-[#333333] text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-[#333333]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-400 bg-black border border-[#333333] rounded-lg hover:bg-[#1a1a1a] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              {employee ? 'Update' : 'Create'} Employee
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}