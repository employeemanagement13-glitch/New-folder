// app/admin/employee-management/page.tsx
'use client';
import React, { useState, useEffect } from 'react';
import { Search, Users, Calendar, Plus, Download, Edit2, Trash2 } from 'lucide-react';

// Reusable Components
import DataTable from '@/Components/DataTable';
import FilterSelect from '@/Components/FilterSelect';
import SectionHeader from '@/Components/SectionHeader';
import EmployeeForm from '@/Components/Employee/EmployeeForm';

// Data functions
import {
  fetchEmployees,
  fetchDepartments,
  fetchRoles,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  type Employee,
  type CreateEmployeeData
} from '@/lib/Admin/employee-data';

export default function EmployeeManagementPage() {
  // State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [roles, setRoles] = useState<{ id: string; role_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading initial data...');
      
      const [employeesData, departmentsData, rolesData] = await Promise.all([
        fetchEmployees(),
        fetchDepartments(),
        fetchRoles()
      ]);

      console.log('📊 Loaded data:', {
        employees: employeesData,
        departments: departmentsData,
        roles: rolesData
      });

      setEmployees(employeesData);
      setDepartments(departmentsData);
      setRoles(rolesData);

    } catch (error) {
      console.error('❌ Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load filtered data when filters change
  useEffect(() => {
    if (selectedDepartment || selectedDate) {
      loadFilteredData();
    }
  }, [selectedDepartment, selectedDate]);

  const loadFilteredData = async () => {
    try {
      setLoading(true);
      const filteredData = await fetchEmployees({
        department: selectedDepartment || undefined,
        date: selectedDate || undefined
      });
      setEmployees(filteredData);
    } catch (error) {
      console.error('Error loading filtered data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter employees based on search term (client-side)
  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = searchTerm === '' || 
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  // Department options for filter
  const departmentOptions = [
    { value: '', label: 'All Departments' },
    ...departments.map(dept => ({ value: dept.name, label: dept.name }))
  ];

  // Table columns - SIMPLIFIED: No manager column
  const tableColumns = [
    { 
      key: 'employee_id', 
      label: 'Emp ID',
      render: (value: string) => (
        <span className="font-mono text-sm text-gray-300">{value}</span>
      )
    },
    { key: 'name', label: 'Employee Name' },
    { 
      key: 'email', 
      label: 'Email',
      render: (value: string) => (
        <span className="text-gray-300">{value}</span>
      )
    },
    { 
      key: 'department_name', 
      label: 'Department',
      render: (value: string) => (
        <span className="text-gray-300">{value}</span>
      )
    },
    { 
      key: 'role_name', 
      label: 'Role',
      render: (value: string) => (
        <span className="text-gray-300">{value}</span>
      )
    },
    { 
      key: 'joining_date', 
      label: 'Join Date',
      render: (value: string) => (
        <span className="whitespace-nowrap text-gray-300">
          {new Date(value).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })}
        </span>
      )
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (value: string) => {
        const statusConfig = {
          active: { color: 'text-green-400', bg: 'bg-green-400/10', label: 'Active' },
          inactive: { color: 'text-red-400', bg: 'bg-red-400/10', label: 'Inactive' },
          probation: { color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'Probation' },
          resigned: { color: 'text-orange-400', bg: 'bg-orange-400/10', label: 'Resigned' },
          on_leave: { color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'On Leave' }
        };

        const config = statusConfig[value as keyof typeof statusConfig] || 
                      { color: 'text-gray-400', bg: 'bg-gray-400/10', label: value };

        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
            {config.label}
          </span>
        );
      }
    },
    { 
      key: 'actions', 
      label: 'Actions',
      render: (value: any, row: Employee) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(row)}
            className="p-1 text-[#ff9d00] hover:text-[#e68e00] cursor-pointer transition-colors"
            title="Edit Employee"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="p-1 text-red-400 cursor-pointer hover:text-red-300 transition-colors"
            title="Delete Employee"
          >
            <Trash2 size={16} />
          </button>
          {/* <button
            onClick={() => handleResetPassword(row.email)}
            className="p-1 text-green-400 hover:text-green-300 transition-colors"
            title="Reset Password"
          >
            <Key size={16} />
          </button> */}
        </div>
      )
    }
  ];

  // Form Handlers
  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setIsFormOpen(true);
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsFormOpen(true);
  };

  const handleDelete = async (employeeId: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;

    const { success, error } = await deleteEmployee(employeeId);
    if (success) {
      await loadInitialData(); // Reload to reflect changes
      alert('Employee deleted successfully');
    } else {
      alert(`Error deleting employee: ${error}`);
    }
  };

  // const handleResetPassword = async (email: string) => {
  //   // This would integrate with Clerk's invitation system
  //   alert(`Password reset invitation sent to: ${email}`);
  // };

  const handleFormSubmit = async (formData: CreateEmployeeData) => {
    setFormLoading(true);
    
    try {
      if (editingEmployee) {
        // Update existing employee
        const { success, error } = await updateEmployee(editingEmployee.id, formData);
        if (success) {
          await loadInitialData();
          setIsFormOpen(false);
          setEditingEmployee(null);
          alert('Employee updated successfully');
        } else {
          alert(`Error updating employee: ${error}`);
        }
      } else {
        // Create new employee
        const { success, error } = await createEmployee(formData);
        if (success) {
          await loadInitialData();
          setIsFormOpen(false);
          alert('Employee created successfully');
        } else {
          alert(`Error creating employee: ${error}`);
        }
      }
    } catch (error) {
      console.error('Error in form submission:', error);
      alert('An unexpected error occurred');
    } finally {
      setFormLoading(false);
    }
  };

  // Export functionality
  const handleExport = () => {
    const csvContent = [
      ['Employee ID', 'Name', 'Email', 'Department', 'Role', 'Join Date', 'Status'],
      ...filteredEmployees.map(emp => [
        emp.employee_id,
        emp.name,
        emp.email,
        emp.department_name,
        emp.role_name,
        emp.joining_date,
        emp.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `employees-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedDepartment('');
    setSelectedDate('');
    loadInitialData();
  };

  return (
    <div className="min-h-screen bg-[#171717] text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-full mx-auto">
        {/* Header Section */}
        <SectionHeader 
          title="Employee Management"
          description=""
          actions={
            <div className="flex flex-col justify-center items-center sm:flex-row gap-3 w-full sm:w-auto">
              {/* Search Input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64 p-2 pl-10 rounded-lg bg-black border border-[#333333] text-white text-sm focus:ring-2 focus:ring-[#ff9d00] focus:border-[#ff9d00]"
                />
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>

              {/* Department Filter */}
              <FilterSelect
                options={departmentOptions}
                value={selectedDepartment}
                onChange={setSelectedDepartment}
                icon={<Users size={16} />}
                placeholder="All Departments"
              />

              {/* Date Filter */}
              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full sm:w-48 p-2 pl-9 pr-2 rounded-lg bg-black border border-[#333333] text-white text-sm focus:ring-2 focus:ring-[#ff9d00] focus:border-[#ff9d00]"
                />
                <Calendar size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>

              {/* Clear Filters */}
              {(searchTerm || selectedDepartment || selectedDate) && (
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2 bg-transparent hover:bg-[#1a1a1a] text-white border border-[#333333] rounded-lg text-sm font-medium transition-colors"
                >
                  Clear Filters
                </button>
              )}

              {/* Export Button */}
              <button
                onClick={handleExport}
                disabled={filteredEmployees.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-transparent hover:bg-[#1a1a1a] disabled:bg-gray-600 text-white border border-[#333333] rounded-lg text-sm font-medium transition-colors"
              >
                <Download size={16} />
                Export
              </button>

              {/* Add Employee Button */}
              <button
                onClick={handleAddEmployee}
                className="flex items-center gap-2 px-4 py-2 bg-[#ff9d00] hover:bg-[#e68e00] text-black rounded-lg text-sm font-medium transition-colors"
              >
                <Plus size={16} />
                <div className='flex items-center gap-2'>
               <span>Add</span> 
               <span>Employee</span> 
                </div>
              </button>
            </div>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#111111] p-4 rounded-lg border border-[#333333]">
            <div className="text-2xl font-bold text-white">{employees.length}</div>
            <div className="text-sm text-gray-400">Total Employees</div>
          </div>
          <div className="bg-[#111111] p-4 rounded-lg border border-[#333333]">
            <div className="text-2xl font-bold text-white">
              {departments.length}
            </div>
            <div className="text-sm text-gray-400">Departments</div>
          </div>
          <div className="bg-[#111111] p-4 rounded-lg border border-[#333333]">
            <div className="text-2xl font-bold text-white">
              {new Set(employees.map(emp => emp.department_name)).size}
            </div>
            <div className="text-sm text-gray-400">Active Departments</div>
          </div>
          <div className="bg-[#111111] p-4 rounded-lg border border-[#333333]">
            <div className="text-2xl font-bold text-white">
              {employees.filter(emp => emp.status === 'active').length}
            </div>
            <div className="text-sm text-gray-400">Active Employees</div>
          </div>
        </div>

        {/* Data Table */}
        <div className="mt-6">
          <DataTable
            columns={tableColumns}
            data={filteredEmployees}
            loading={loading}
            emptyMessage={
              searchTerm || selectedDepartment || selectedDate 
                ? "No employees found matching your filters"
                : "No employees found. Add your first employee!"
            }
          />
        </div>

        {/* Employee Form Modal */}
        <EmployeeForm
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditingEmployee(null);
          }}
          onSubmit={handleFormSubmit}
          initialData={editingEmployee}
          departments={departments}
          roles={roles}
          managers={[]} // Empty array since we don't need managers
          loading={formLoading}
        />
      </div>
    </div>
  );
}