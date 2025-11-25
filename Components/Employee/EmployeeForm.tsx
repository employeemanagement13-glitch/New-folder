// components/EmployeeForm.tsx - UPDATED VERSION
'use client';
import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { fetchRoles, checkDepartmentHasManager, getDepartmentManagerRoleId } from '@/lib/Admin/employee-data';

interface EmployeeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
  departments: { id: string; name: string; has_manager?: boolean }[];
  roles: { id: string; role_name: string }[];
  managers: { id: string; name: string }[];
  loading?: boolean;
}

export default function EmployeeForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  departments,
  roles: initialRoles,
  managers,
  loading = false
}: EmployeeFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    employee_id: '',
    department_id: '',
    role_id: '',
    joining_date: new Date().toISOString().split('T')[0],
    employment_type: 'full_time' as 'full_time' | 'contract' | 'intern',
    phone: '',
    address: ''
  });

  const [roles, setRoles] = useState<{ id: string; role_name: string; disabled?: boolean }[]>(initialRoles);
  const [departmentManagerRoleId, setDepartmentManagerRoleId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string>('');

  // Initialize form data
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        email: initialData.email || '',
        employee_id: initialData.employee_id || '',
        department_id: initialData.department_id || '',
        role_id: initialData.role_id || '',
        joining_date: initialData.joining_date || new Date().toISOString().split('T')[0],
        employment_type: initialData.employment_type || 'full_time',
        phone: initialData.phone || '',
        address: initialData.address || ''
      });
    } else {
      setFormData(prev => ({
        ...prev,
        employee_id: `EMP${Date.now()}`
      }));
    }
  }, [initialData, isOpen]);

  // Get Department Manager role ID on component mount
  useEffect(() => {
    const loadDepartmentManagerRoleId = async () => {
      const managerRoleId = await getDepartmentManagerRoleId();
      setDepartmentManagerRoleId(managerRoleId);
    };
    loadDepartmentManagerRoleId();
  }, []);

  // Load roles based on selected department
  useEffect(() => {
    const loadRolesForDepartment = async () => {
      if (formData.department_id) {
        setValidationError('');
        const departmentRoles = await fetchRoles(formData.department_id);
        setRoles(departmentRoles);

        // If role was previously selected but now disabled, clear it
        if (formData.role_id) {
          const selectedRole = departmentRoles.find(role => role.id === formData.role_id);
          if (selectedRole?.disabled) {
            setFormData(prev => ({ ...prev, role_id: '' }));
            setValidationError(`Department Manager role is not available for this department. Department already has a manager.`);
          }
        }
      } else {
        setRoles(initialRoles);
      }
    };

    loadRolesForDepartment();
  }, [formData.department_id, initialRoles]);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'department_id') {
      // When department changes, clear role and validation errors
      setFormData(prev => ({ 
        ...prev, 
        department_id: value,
        role_id: '' // Clear role when department changes
      }));
      setValidationError('');
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!formData.department_id) {
      setValidationError('Please select a department');
      return;
    }

    if (!formData.role_id) {
      setValidationError('Please select a role');
      return;
    }

    // Additional validation for Department Manager role
    if (formData.role_id === departmentManagerRoleId) {
      const { hasManager, managerName } = await checkDepartmentHasManager(formData.department_id);
      if (hasManager) {
        setValidationError(`Cannot assign Department Manager role. Department already has a manager (${managerName || 'Unknown'}).`);
        return;
      }
    }

    await onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#111111] rounded-xl border border-[#333333] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-[#333333]">
          <h2 className="text-xl font-semibold text-white">
            {initialData ? 'Edit Employee' : 'Add New Employee'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Validation Error */}
          {validationError && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-red-400 text-sm">{validationError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Employee ID */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Employee ID *</label>
              <input
                type="text"
                name="employee_id"
                value={formData.employee_id}
                onChange={handleChange}
                required
                disabled={!!initialData}
                className="w-full p-3 rounded-lg bg-black border border-[#333333] text-white text-sm focus:ring-2 focus:ring-[#ff9d00] focus:border-[#ff9d00] disabled:opacity-50"
                placeholder="EMP001"
              />
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Full Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full p-3 rounded-lg bg-black border border-[#333333] text-white text-sm focus:ring-2 focus:ring-[#ff9d00] focus:border-[#ff9d00]"
                placeholder="John Doe"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email Address *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full p-3 rounded-lg bg-black border border-[#333333] text-white text-sm focus:ring-2 focus:ring-[#ff9d00] focus:border-[#ff9d00]"
                placeholder="john.doe@company.com"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full p-3 rounded-lg bg-black border border-[#333333] text-white text-sm focus:ring-2 focus:ring-[#ff9d00] focus:border-[#ff9d00]"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            {/* Department - MUST BE SELECTED FIRST */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Department *</label>
              <select
                name="department_id"
                value={formData.department_id}
                onChange={handleChange}
                required
                className="w-full p-3 rounded-lg bg-black border border-[#333333] text-white text-sm focus:ring-2 focus:ring-[#ff9d00] focus:border-[#ff9d00]"
              >
                <option value="">Select Department First</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} {dept.has_manager ? ' (Has Manager)' : ''}
                  </option>
                ))}
              </select>
              {formData.department_id && departments.find(d => d.id === formData.department_id)?.has_manager && (
                <div className="mt-1 text-xs text-yellow-400 flex items-center gap-1">
                  <AlertCircle size={12} />
                  This department already has a manager
                </div>
              )}
            </div>

            {/* Role - DEPENDS ON DEPARTMENT SELECTION */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Role *</label>
              <select
                name="role_id"
                value={formData.role_id}
                onChange={handleChange}
                required
                disabled={!formData.department_id}
                className="w-full p-3 rounded-lg bg-black border border-[#333333] text-white text-sm focus:ring-2 focus:ring-[#ff9d00] focus:border-[#ff9d00] disabled:opacity-50"
              >
                <option value="">
                  {formData.department_id ? 'Select Role' : 'Select Department First'}
                </option>
                {roles.map(role => (
                  <option 
                    key={role.id} 
                    value={role.id}
                    disabled={role.disabled}
                    className={role.disabled ? 'text-gray-500 bg-gray-800' : ''}
                  >
                    {role.role_name} {role.disabled ? ' (Not Available)' : ''}
                  </option>
                ))}
              </select>
              {!formData.department_id && (
                <div className="mt-1 text-xs text-gray-400">
                  Please select a department first to see available roles
                </div>
              )}
            </div>

            {/* Employment Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Employment Type *</label>
              <select
                name="employment_type"
                value={formData.employment_type}
                onChange={handleChange}
                required
                className="w-full p-3 rounded-lg bg-black border border-[#333333] text-white text-sm focus:ring-2 focus:ring-[#ff9d00] focus:border-[#ff9d00]"
              >
                <option value="full_time">Full Time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
              </select>
            </div>

            {/* Joining Date */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Joining Date *</label>
              <input
                type="date"
                name="joining_date"
                value={formData.joining_date}
                onChange={handleChange}
                required
                className="w-full p-3 rounded-lg bg-black border border-[#333333] text-white text-sm focus:ring-2 focus:ring-[#ff9d00] focus:border-[#ff9d00]"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Address</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={3}
              className="w-full p-3 rounded-lg bg-black border border-[#333333] text-white text-sm focus:ring-2 focus:ring-[#ff9d00] focus:border-[#ff9d00]"
              placeholder="Enter full address..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.department_id || !formData.role_id}
              className="px-6 py-2 bg-[#ff9d00] hover:bg-[#e68e00] disabled:bg-gray-600 disabled:text-gray-400 text-black rounded-lg text-sm font-medium transition-colors"
            >
              {loading ? 'Saving...' : (initialData ? 'Update Employee' : 'Add Employee')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}