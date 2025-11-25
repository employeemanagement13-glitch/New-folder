'use client';

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { Employee, EmployeeFormData } from '@/type/employees';
import * as XLSX from 'xlsx';
import { FilterSelect } from '../AdminHelper/FilterSelect';

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [bulkUpload, setBulkUpload] = useState(false);
  const [formData, setFormData] = useState<EmployeeFormData>({
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
    type: 'Full Time'
  });
  const [excelData, setExcelData] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  // Filter options
  const statusOptions = ['active', 'inactive'];
  const typeOptions = ['Full Time', 'Part Time', 'Contract', 'Intern'];

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
    fetchRoles();
    setupRealtimeSubscription();
  }, []);

  useEffect(() => {
    if (departments.length > 0) {
      fetchManagers();
    }
  }, [departments]);

  const fetchEmployees = async () => {
    try {
      const { data: employeesData, error } = await supabaseClient
        .from('employees')
        .select(`
          *,
          department:departments(name),
          role:roles(role_name),
          manager:employees!manager_id(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmployees(employeesData || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    const { data } = await supabaseClient
      .from('departments')
      .select('id, name')
      .eq('status', 'active');
    setDepartments(data || []);
  };

  const fetchManagers = async () => {
    const { data } = await supabaseClient
      .from('employees')
      .select('id, full_name, department_id')
      .eq('status', 'active');
    setManagers(data || []);
  };

  const fetchRoles = async () => {
    const { data } = await supabaseClient
      .from('roles')
      .select('id, role_name')
      .order('role_name');
    setRoles(data || []);
  };

  const setupRealtimeSubscription = () => {
    const subscription = supabaseClient
      .channel('employees-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employees'
        },
        () => {
          fetchEmployees();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      const full_name = `${formData.first_name} ${formData.last_name}`.trim();
      
      const { data, error } = await supabaseClient
        .from('employees')
        .insert([
          {
            ...formData,
            full_name,
            clerk_user_id: `emp_${Date.now()}`
          }
        ])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        alert('Employee added successfully!');
        resetForm();
        setShowForm(false);
      }
    } catch (error) {
      console.error('Error adding employee:', error);
      alert('Error adding employee');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
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
      type: 'Full Time'
    });
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        alert('Excel file is empty');
        return;
      }

      setExcelData(jsonData);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleBulkSubmit = async () => {
    if (excelData.length === 0) {
      alert('No data to upload');
      return;
    }

    setUploading(true);

    try {
      const employeesToInsert = excelData.map(emp => ({
        first_name: emp.first_name || emp.firstName || '',
        last_name: emp.last_name || emp.lastName || '',
        full_name: `${emp.first_name || emp.firstName || ''} ${emp.last_name || emp.lastName || ''}`.trim(),
        email: emp.email || '',
        department_id: emp.department_id || '',
        role_id: emp.role_id || emp.role || roles[0]?.id || '',
        manager_id: emp.manager_id || '',
        status: emp.status || 'active',
        join_date: emp.join_date || emp.joinDate || new Date().toISOString().split('T')[0],
        phone: emp.phone || '',
        address: emp.address || '',
        type: emp.type || 'Full Time',
        clerk_user_id: `emp_bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }));

      // Validate required fields
      const invalidEmployees = employeesToInsert.filter(emp => 
        !emp.first_name || !emp.last_name || !emp.email || !emp.department_id || !emp.role_id
      );

      if (invalidEmployees.length > 0) {
        alert('Some employees are missing required fields (first_name, last_name, email, department_id, role_id)');
        return;
      }

      const { data, error } = await supabaseClient
        .from('employees')
        .insert(employeesToInsert)
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        alert(`Successfully added ${data.length} employees!`);
        setExcelData([]);
        setBulkUpload(false);
        const fileInput = document.getElementById('excel-file') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      }
    } catch (error) {
      console.error('Error bulk uploading employees:', error);
      alert('Error uploading employees');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (employeeId: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;
    
    try {
      const { error } = await supabaseClient
        .from('employees')
        .delete()
        .eq('id', employeeId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert('Error deleting employee');
    }
  };

  // Fixed filtering logic - all employees show by default, filters narrow them down
  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = searchTerm === '' || 
      employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = selectedDepartment === '' || 
      employee.department?.name === selectedDepartment;
    
    const matchesStatus = selectedStatus === '' || 
      employee.status === selectedStatus;
    
    const matchesType = selectedType === '' || 
      employee.type === selectedType;
    
    return matchesSearch && matchesDepartment && matchesStatus && matchesType;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64" style={{ backgroundColor: '#171717' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff9d00]"></div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen" style={{ backgroundColor: '#171717' }}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Employee Management</h1>
        <p className="text-gray-400">Manage your employees and their details</p>
      </div>

      {/* Filters and Search */}
      <div className="rounded-lg border p-4 mb-6" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search Employee */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium mb-1 text-white">
              Search Employee
            </label>
            <input
              type="text"
              placeholder="Search by name or email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-white"
              style={{ backgroundColor: '#111111', borderColor: '#333333' }}
            />
          </div>

          {/* Department Filter */}
          <FilterSelect
            value={selectedDepartment}
            onChange={setSelectedDepartment}
            options={departments.map(dept => dept.name)}
            placeholder="Department"
          />

          {/* Status Filter */}
          <FilterSelect
            value={selectedStatus}
            onChange={setSelectedStatus}
            options={statusOptions}
            placeholder="Status"
          />

          {/* Type Filter */}
          <FilterSelect
            value={selectedType}
            onChange={setSelectedType}
            options={typeOptions}
            placeholder="Type"
          />

          {/* Action Buttons */}
          <div className="flex flex-col justify-end space-y-2">
            <button
              onClick={() => setShowForm(true)}
              className="w-full px-4 py-2 rounded-md font-medium transition-colors text-white"
              style={{ backgroundColor: '#ff9d00' }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e68a00'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ff9d00'}
            >
              Add Employee
            </button>
            <button
              onClick={() => setBulkUpload(true)}
              className="w-full px-4 py-2 rounded-md font-medium transition-colors text-white"
              style={{ backgroundColor: '#ff9d00' }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e68a00'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ff9d00'}
            >
              Bulk Upload
            </button>
          </div>
        </div>
      </div>

      {/* Employee Count */}
      <div className="mb-4">
        <p className="text-gray-400">
          Showing {filteredEmployees.length} of {employees.length} employees
        </p>
      </div>

      {/* Rest of your modals and table remain the same */}
      {/* Add Employee Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="rounded-lg border p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
            <h2 className="text-xl font-bold mb-4 text-white">Add New Employee</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-white">First Name *</label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-white"
                    style={{ backgroundColor: '#111111', borderColor: '#333333' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-white">Last Name *</label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-white"
                    style={{ backgroundColor: '#111111', borderColor: '#333333' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-white">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-white"
                    style={{ backgroundColor: '#111111', borderColor: '#333333' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-white">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-white"
                    style={{ backgroundColor: '#111111', borderColor: '#333333' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-white">Department *</label>
                  <select
                    name="department_id"
                    value={formData.department_id}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-white"
                    style={{ backgroundColor: '#111111', borderColor: '#333333' }}
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-white">Role *</label>
                  <select
                    name="role_id"
                    value={formData.role_id}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-white"
                    style={{ backgroundColor: '#111111', borderColor: '#333333' }}
                  >
                    <option value="">Select Role</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>{role.role_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-white">Manager</label>
                  <select
                    name="manager_id"
                    value={formData.manager_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-white"
                    style={{ backgroundColor: '#111111', borderColor: '#333333' }}
                  >
                    <option value="">Select Manager</option>
                    {managers.map(manager => (
                      <option key={manager.id} value={manager.id}>{manager.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-white">Type</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-white"
                    style={{ backgroundColor: '#111111', borderColor: '#333333' }}
                  >
                    {typeOptions.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-white">Join Date</label>
                  <input
                    type="date"
                    name="join_date"
                    value={formData.join_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-white"
                    style={{ backgroundColor: '#111111', borderColor: '#333333' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-white">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-white"
                    style={{ backgroundColor: '#111111', borderColor: '#333333' }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-white">Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-white"
                  style={{ backgroundColor: '#111111', borderColor: '#333333' }}
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border rounded-md text-white transition-colors"
                  style={{ backgroundColor: '#111111', borderColor: '#333333' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 rounded-md font-medium text-white transition-colors disabled:opacity-50"
                  style={{ backgroundColor: '#ff9d00' }}
                >
                  {uploading ? 'Adding...' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal - keep the same as before */}
      {bulkUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          {/* ... your existing bulk upload modal code ... */}
        </div>
      )}

      {/* Employees Table - keep the same as before */}
      <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: '#111111', borderColor: '#333333' }}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y" style={{ borderColor: '#333333' }}>
            <thead>
              <tr style={{ backgroundColor: '#111111' }}>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white">Emp ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white">Emp Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white">Join Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white">Manager</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: '#333333' }}>
              {filteredEmployees.map((employee) => (
                <tr 
                  key={employee.id} 
                  className="transition-colors"
                  style={{ backgroundColor: '#111111' }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1a1a1a'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#111111'}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-white">
                    {employee.id.substring(0, 8)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                    {employee.full_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {employee.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {employee.department?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {employee.role_id || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {new Date(employee.join_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {employee.manager?.full_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      employee.status === 'active' 
                        ? 'bg-green-900 text-green-200' 
                        : 'bg-red-900 text-red-200'
                    }`}>
                      {employee.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-blue-400 hover:text-blue-300 transition-colors">
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(employee.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        Delete
                      </button>
                      <button className="text-orange-400 hover:text-orange-300 transition-colors">
                        Reset Password
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredEmployees.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-400">No employees found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}