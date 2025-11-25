'use client';

import { useState, useEffect } from 'react';
import { TeamMember } from '@/type/managerDashboard';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

interface EditEmployeeModalProps {
  employee: TeamMember;
  onClose: () => void;
  onUpdate: (updatedData: Partial<TeamMember>) => void;
  loading: boolean;
}

interface Role {
  id: string;
  role_name: string;
}

export default function EditEmployeeModal({ employee, onClose, onUpdate, loading }: EditEmployeeModalProps) {
  const [formData, setFormData] = useState({
    name: employee.name,
    email: employee.email,
    phone: employee.phone || '',
    role_id: employee.role_id,
    employment_type: employee.employment_type,
    status: employee.status
  });
  const [roles, setRoles] = useState<Role[]>([]);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('roles')
        .select('id, role_name')
        .order('role_name');

      if (data) {
        setRoles(data);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#111111] border border-[#333333] rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Edit Employee</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Employee ID
            </label>
            <input
              type="text"
              value={employee.employee_id}
              disabled
              className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#333333] rounded text-gray-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#333333] rounded text-white focus:outline-none focus:border-[#ff9d00]"
            />
          </div>

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
              className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#333333] rounded text-white focus:outline-none focus:border-[#ff9d00]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Phone
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#333333] rounded text-white focus:outline-none focus:border-[#ff9d00]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Role *
            </label>
            <select
              name="role_id"
              value={formData.role_id}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#333333] rounded text-white focus:outline-none focus:border-[#ff9d00]"
            >
              <option value="">Select Role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.role_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Employment Type *
            </label>
            <select
              name="employment_type"
              value={formData.employment_type}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#333333] rounded text-white focus:outline-none focus:border-[#ff9d00]"
            >
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
              <option value="contract">Contract</option>
              <option value="intern">Intern</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Status *
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#333333] rounded text-white focus:outline-none focus:border-[#ff9d00]"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#333333] text-white rounded hover:bg-[#444444] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#ff9d00] text-black rounded hover:bg-[#e68e00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating...' : 'Update Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}