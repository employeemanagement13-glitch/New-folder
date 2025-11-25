// app/hr/employees/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Search, Users, Calendar, Filter, Download, Eye } from 'lucide-react';
import Link from 'next/link';
import DataTable from '@/Components/DataTable';
import FilterSelect from '@/Components/FilterSelect';
import SectionHeader from '@/Components/SectionHeader';
import PieChart from '@/Components/charts/PieChart';
import DonutChart from '@/Components/charts/DonutChart';
import { 
  fetchEmployees, 
  fetchDepartments, 
  fetchRoles,
  type Employee 
} from '@/lib/hr/employee-data';
import { EmployeeTypeDistribution, ProfileCompletionData } from '@/type/hremployeetype';

export default function HREmployeePage() {
  // State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<{id: string, name: string}[]>([]);
  const [roles, setRoles] = useState<{id: string, role_name: string}[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedEmploymentType, setSelectedEmploymentType] = useState('');

  // Chart data
  const [employeeTypeDistribution, setEmployeeTypeDistribution] = useState<EmployeeTypeDistribution[]>([]);
  const [profileCompletionData, setProfileCompletionData] = useState<ProfileCompletionData[]>([]);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Filter employees when filters change
  useEffect(() => {
    filterEmployees();
  }, [employees, searchTerm, selectedDepartment, selectedStatus, selectedEmploymentType]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading employee data...');
      
      const [employeesData, departmentsData, rolesData] = await Promise.all([
        fetchEmployees(),
        fetchDepartments(),
        fetchRoles()
      ]);

      console.log('✅ Data loaded:', {
        employees: employeesData.length,
        departments: departmentsData.length,
        roles: rolesData.length
      });

      setEmployees(employeesData);
      setDepartments(departmentsData);
      setRoles(rolesData);

      // Calculate chart data
      calculateEmployeeTypeDistribution(employeesData);
      calculateProfileCompletionStatus(employeesData);

    } catch (error) {
      console.error('❌ Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFilteredData = async () => {
    try {
      setLoading(true);
      const filteredData = await fetchEmployees({
        department: selectedDepartment || undefined,
        status: selectedStatus || undefined,
        employment_type: selectedEmploymentType || undefined
      });
      setEmployees(filteredData);
    } catch (error) {
      console.error('Error loading filtered data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterEmployees = () => {
    let filtered = employees;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(employee =>
        employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Department filter
    if (selectedDepartment) {
      filtered = filtered.filter(employee =>
        employee.department_name === selectedDepartment
      );
    }

    // Status filter
    if (selectedStatus) {
      filtered = filtered.filter(employee => employee.status === selectedStatus);
    }

    // Employment type filter
    if (selectedEmploymentType) {
      filtered = filtered.filter(employee => employee.employment_type === selectedEmploymentType);
    }

    setFilteredEmployees(filtered);
  };

  const calculateEmployeeTypeDistribution = (employeesData: Employee[]) => {
    const typeCounts: { [key: string]: number } = {};
    
    employeesData.forEach(employee => {
      const type = employee.employment_type;
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const total = employeesData.length;
    const distribution: EmployeeTypeDistribution[] = Object.entries(typeCounts).map(([type, count]) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' '),
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    }));

    setEmployeeTypeDistribution(distribution);
  };

  const calculateProfileCompletionStatus = (employeesData: Employee[]) => {
    let completeCount = 0;
    let partialCount = 0;
    let incompleteCount = 0;

    employeesData.forEach(employee => {
      const completedFields = [
        employee.name,
        employee.email,
        employee.phone,
        employee.address,
        employee.department_id,
        employee.role_id,
        employee.employment_type,
        employee.joining_date
      ].filter(field => field && field.toString().trim() !== '').length;

      const totalFields = 8; // All required fields

      const completionPercentage = (completedFields / totalFields) * 100;

      if (completionPercentage >= 90) {
        completeCount++;
      } else if (completionPercentage >= 50) {
        partialCount++;
      } else {
        incompleteCount++;
      }
    });

    const total = employeesData.length;
    const completionData: ProfileCompletionData[] = [
      {
        status: 'complete',
        count: completeCount,
        percentage: total > 0 ? Math.round((completeCount / total) * 100) : 0,
        color: '#10B981' // Green
      },
      {
        status: 'partial',
        count: partialCount,
        percentage: total > 0 ? Math.round((partialCount / total) * 100) : 0,
        color: '#F59E0B' // Amber
      },
      {
        status: 'incomplete',
        count: incompleteCount,
        percentage: total > 0 ? Math.round((incompleteCount / total) * 100) : 0,
        color: '#EF4444' // Red
      }
    ];

    setProfileCompletionData(completionData);
  };

  // Table columns
  const tableColumns = [
    { 
      key: 'name', 
      label: 'Name',
      sortable: true,
      render: (value: string, row: Employee) => (
        <div className="flex items-center gap-3">
          {/* <div className="w-8 h-8 bg-[#ff9d00] rounded-full flex items-center justify-center text-xs font-bold text-black">
            {value.split(' ').map(n => n[0]).join('')}
          </div> */}
          <span className="font-medium text-white">{value}</span>
        </div>
      )
    },
    { 
      key: 'employee_id', 
      label: 'ID',
      sortable: true,
      render: (value: string) => (
        <span className="font-mono text-sm text-gray-300">{value}</span>
      )
    },
    { 
      key: 'email', 
      label: 'Email',
      sortable: true,
      render: (value: string) => (
        <span className="text-gray-300">{value}</span>
      )
    },
    { 
      key: 'department_name', 
      label: 'Department',
      render: (value: string) => (
        <span className="text-gray-300">{value || 'N/A'}</span>
      )
    },
    { 
      key: 'role_name', 
      label: 'Role',
      render: (value: string) => (
        <span className="text-gray-300">{value || 'N/A'}</span>
      )
    },
    { 
      key: 'joining_date', 
      label: 'Date',
      render: (value: string) => (
        <span className="whitespace-nowrap text-gray-300">
          {new Date(value).toLocaleDateString('en-GB')}
        </span>
      )
    },
    { 
      key: 'employment_type', 
      label: 'Type',
      render: (value: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'full_time' ? 'bg-blue-500/20 text-blue-400' :
          value === 'contract' ? 'bg-purple-500/20 text-purple-400' :
          'bg-green-500/20 text-green-400'
        }`}>
          {value === 'full_time' ? 'Full Time' : 
           value === 'contract' ? 'Contract' : 'Intern'}
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
      render: (value: string, row: Employee) => (
        <Link 
          href={`/hr/dashboard/employees/${row.id}`}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-[#ff9d00] hover:text-[#e68e00] text-sm font-medium rounded-md transition-colors"
        >
          {/* <Eye size={14} /> */}
          View
        </Link>
      )
    }
  ];

  // Filter options
  const departmentOptions = [
    { value: '', label: 'All Departments' },
    ...departments.map(dept => ({ value: dept.name, label: dept.name }))
  ];

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'probation', label: 'Probation' },
    { value: 'resigned', label: 'Resigned' },
    { value: 'on_leave', label: 'On Leave' }
  ];

  const employmentTypeOptions = [
    { value: '', label: 'All Types' },
    { value: 'full_time', label: 'Full Time' },
    { value: 'contract', label: 'Contract' },
    { value: 'intern', label: 'Intern' }
  ];

  // Export functionality
  const handleExport = () => {
    const csvContent = [
      ['Name', 'ID', 'Email', 'Department', 'Role', 'Join Date', 'Type', 'Status'],
      ...filteredEmployees.map(emp => [
        emp.name,
        emp.employee_id,
        emp.email,
        emp.department_name,
        emp.role_name,
        emp.joining_date,
        emp.employment_type,
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
    setSelectedStatus('');
    setSelectedEmploymentType('');
    loadInitialData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#171717] flex items-center justify-center">
        <div className="text-white text-xl">Loading Employee Data...</div>
      </div>
    );
  }

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

              {/* Status Filter */}
              <FilterSelect
                options={statusOptions}
                value={selectedStatus}
                onChange={setSelectedStatus}
                icon={<Filter size={16} />}
                placeholder="All Status"
              />

              {/* Employment Type Filter */}
              <FilterSelect
                options={employmentTypeOptions}
                value={selectedEmploymentType}
                onChange={setSelectedEmploymentType}
                icon={<Calendar size={16} />}
                placeholder="All Types"
              />

              {/* Clear Filters */}
              {(searchTerm || selectedDepartment || selectedStatus || selectedEmploymentType) && (
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
            </div>
          }
        />

        {/* Employee Records Table */}
        <div className="mt-6">
          <DataTable
            columns={tableColumns}
            data={filteredEmployees}
            loading={loading}
            emptyMessage={
              searchTerm || selectedDepartment || selectedStatus || selectedEmploymentType
                ? "No employees found matching your filters"
                : "No employees found in the system"
            }
          />
        </div>

        {/* Charts Section - Stacked vertically */}
        <div className="grid grid-cols-1 gap-6 mt-8">
          {/* Employee Type Distribution Chart */}
          <div className="bg-[#111111] rounded-xl border border-[#333333] p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Employee Type Distribution</h3>
            {employeeTypeDistribution.length > 0 ? (
              <div className="h-80">
                <PieChart
                  data={employeeTypeDistribution}
                  dataKey="count"
                  nameKey="type"
                  colors={['#ff9d00', '#10B981', '#3B82F6']}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-gray-400">
                No data available
              </div>
            )}
            <div className="mt-4 space-y-2">
              {employeeTypeDistribution.map((item, index) => (
                <div key={item.type} className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2"
                      style={{
                        backgroundColor: ['#ff9d00', '#10B981', '#3B82F6'][index]
                      }}
                    ></div>
                    <span className="text-sm text-gray-300">{item.type}</span>
                  </div>
                  <span className="text-sm text-white font-medium">
                    {item.count} ({item.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Profile Completion Status Chart */}
          <div className="bg-[#111111] rounded-xl border border-[#333333] p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Profile Completion Status</h3>
            {profileCompletionData.length > 0 ? (
              <div className="h-80">
                <DonutChart
                  data={profileCompletionData}
                  dataKey="count"
                  nameKey="status"
                  colors={profileCompletionData.map(item => item.color)}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-gray-400">
                No data available
              </div>
            )}
            <div className="mt-4 space-y-2">
              {profileCompletionData.map((item) => (
                <div key={item.status} className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm text-gray-300 capitalize">
                      {item.status} Profiles ({item.percentage}%)
                    </span>
                  </div>
                  <span className="text-sm text-white font-medium">
                    {item.count} employees
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}