// app/admin/departments/page.tsx
'use client';

import { useState, useEffect } from 'react';
import SectionHeader from '@/Components/SectionHeader';
import DataTable from '@/Components/DataTable';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Department {
  id: string;
  name: string;
  description: string | null;
  manager_id: string | null;
  location: string;
  status: 'active' | 'inactive';
  created_at: string;
  hod_name?: string;
  total_employees?: number;
}

export default function DepartmentOverview() {

  const router = useRouter();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    status: 'active' as 'active' | 'inactive'
  });

  // Fetch departments from Supabase with proper manager assignment
  const fetchDepartments = async () => {
    try {
      setLoading(true);
      console.log('🔄 Starting to fetch departments with managers...');

      // First, get the Department Manager role ID from roles table
      const { data: managerRole, error: roleError } = await supabaseAdmin
        .from('roles')
        .select('id')
        .eq('role_name', 'Department Manager')
        .single();

      if (roleError) {
        console.error('❌ Error fetching Department Manager role:', roleError);
        // Fallback: try common variations
        const { data: fallbackRoles } = await supabaseAdmin
          .from('roles')
          .select('id, role_name')
          .ilike('role_name', '%manager%');
        
        console.log('🔍 Available manager-like roles:', fallbackRoles);
      }

      const departmentManagerRoleId = managerRole?.id;
      console.log('🎯 Department Manager Role ID:', departmentManagerRoleId);

      // Get all departments
      const { data: departmentsData, error } = await supabaseAdmin
        .from('departments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('💥 Error fetching departments:', error);
        throw error;
      }

      if (!departmentsData || departmentsData.length === 0) {
        console.log('ℹ️ No departments found in database');
        setDepartments([]);
        return;
      }

      console.log(`✅ Found ${departmentsData.length} departments`);

      // Get all employees who are Department Managers
      const { data: managerEmployees, error: managersError } = await supabaseAdmin
        .from('employees')
        .select('id, name, department_id, role_id')
        .eq('role_id', departmentManagerRoleId);

      if (managersError) {
        console.error('❌ Error fetching manager employees:', managersError);
      }

      console.log('👨‍💼 Department Managers found:', managerEmployees);

      // For each department, get additional details
      const departmentsWithDetails = await Promise.all(
        departmentsData.map(async (dept) => {
          try {
            // Get employee count for this department
            const { count: employeeCount, error: countError } = await supabaseAdmin
              .from('employees')
              .select('*', { count: 'exact', head: true })
              .eq('department_id', dept.id);

            if (countError) {
              console.error(`❌ Error counting employees for ${dept.name}:`, countError);
            }

            // Find the manager for this department
            let hod_name = 'Not Assigned';
            let actualManagerId = dept.manager_id;

            // If department has a manager_id set, use that
            if (dept.manager_id) {
              const { data: assignedManager, error: managerError } = await supabaseAdmin
                .from('employees')
                .select('name')
                .eq('id', dept.manager_id)
                .single();

              if (!managerError && assignedManager) {
                hod_name = assignedManager.name;
              }
            } 
            // If no manager_id set but we have Department Manager employees, find one for this department
            else if (managerEmployees && managerEmployees.length > 0) {
              const departmentManager = managerEmployees.find(emp => 
                emp.department_id === dept.id
              );

              if (departmentManager) {
                hod_name = departmentManager.name;
                actualManagerId = departmentManager.id;
                
                // Auto-update the department with the found manager
                const { error: updateError } = await supabaseAdmin
                  .from('departments')
                  .update({ manager_id: departmentManager.id })
                  .eq('id', dept.id);

                if (!updateError) {
                  console.log(`✅ Auto-assigned ${departmentManager.name} as manager of ${dept.name}`);
                }
              }
            }

            // If we found a manager through role matching but department doesn't have manager_id, update it
            if (actualManagerId && !dept.manager_id) {
              const { error: updateError } = await supabaseAdmin
                .from('departments')
                .update({ manager_id: actualManagerId })
                .eq('id', dept.id);

              if (!updateError) {
                console.log(`✅ Updated department ${dept.name} with manager ${hod_name}`);
              }
            }

            return {
              id: dept.id,
              name: dept.name,
              description: dept.description,
              manager_id: actualManagerId || dept.manager_id,
              location: dept.location,
              status: dept.status,
              created_at: dept.created_at,
              total_employees: employeeCount || 0,
              hod_name: hod_name
            };
          } catch (departmentError) {
            console.error(`❌ Error processing department ${dept.name}:`, departmentError);
            return {
              id: dept.id,
              name: dept.name,
              description: dept.description,
              manager_id: dept.manager_id,
              location: dept.location,
              status: dept.status,
              created_at: dept.created_at,
              total_employees: 0,
              hod_name: 'Not Assigned'
            };
          }
        })
      );

      console.log('🎉 Final departments data with managers:', departmentsWithDetails);
      setDepartments(departmentsWithDetails);

    } catch (error) {
      console.error('💥 Error in fetchDepartments:', error);
      const errorMessage = (error as any)?.message || 'Unknown error occurred';
      alert(`Failed to load departments: ${errorMessage}`);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🚀 Component mounted, fetching departments...');
    fetchDepartments();

    // Set up real-time subscriptions for both departments and employees
    try {
      const departmentsSubscription = supabaseAdmin
        .channel('departments-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'departments'
          },
          (payload) => {
            console.log('🔄 Departments real-time update:', payload);
            fetchDepartments();
          }
        )
        .subscribe();

      const employeesSubscription = supabaseAdmin
        .channel('employees-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'employees'
          },
          (payload) => {
            console.log('🔄 Employees real-time update:', payload);
            fetchDepartments(); // Refresh when employees change (role changes, etc.)
          }
        )
        .subscribe();

      return () => {
        console.log('🧹 Cleaning up realtime subscriptions');
        departmentsSubscription.unsubscribe();
        employeesSubscription.unsubscribe();
      };
    } catch (subscriptionError) {
      console.error('❌ Error setting up realtime subscriptions:', subscriptionError);
    }
  }, []);

  // Enhanced form submission with manager assignment option
  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📝 Adding department:', formData);
    
    try {
      const { data, error } = await supabaseAdmin
        .from('departments')
        .insert([{
          name: formData.name,
          description: formData.description,
          location: formData.location,
          status: formData.status,
          created_at: new Date().toISOString()
          // manager_id will be auto-assigned later based on role
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Insert error details:', error);
        throw error;
      }

      alert('✅ Department created successfully! Managers will be auto-assigned based on employee roles.');
      setShowAddForm(false);
      setFormData({ name: '', description: '', location: '', status: 'active' });
      
    } catch (error) {
      console.error('💥 Error creating department:', error);
      const errorMessage = (error as any)?.message || 'Unknown error occurred';
      alert(`Failed to create department: ${errorMessage}`);
    }
  };

  // Enhanced edit function to assign/unassign managers
  const handleEdit = async (department: Department) => {
    const action = prompt(
      `Edit Department: ${department.name}\n\nChoose action:\n1. Rename department\n2. Assign/change manager\n3. Unassign manager\n\nEnter 1, 2, or 3:`
    );

    if (action === '1') {
      // Rename department
      const newName = prompt(`Enter new department name: ${department.name} id: ${department.id}`, department.name);
      if (newName && newName !== department.name) {
        try {
          const { error } = await supabaseAdmin
            .from('departments')
            .update({ 
              name: newName,
              updated_at: new Date().toISOString()
            })
            .eq('id', department.id);

          if (error) throw error;
          alert('✅ Department name updated successfully');
        } catch (error) {
          console.error('❌ Error updating department:', error);
          alert('Failed to update department');
        }
      }
    } else if (action === '2') {
      // Assign/change manager
      const managerName = prompt('Enter employee name to assign as manager:');
      if (managerName) {
        try {
          // Find employee by name
          const { data: employees, error: searchError } = await supabaseAdmin
            .from('employees')
            .select('id, name, role_id')
            .ilike('name', `%${managerName}%`);

          if (searchError) throw searchError;

          if (!employees || employees.length === 0) {
            alert('❌ No employee found with that name');
            return;
          }

          if (employees.length > 1) {
            const employeeList = employees.map((emp, index) => 
              `${index + 1}. ${emp.name} (ID: ${emp.id})`
            ).join('\n');
            const choice = prompt(`Multiple employees found:\n\n${employeeList}\n\nEnter the number of the correct employee:`);
            const selectedIndex = parseInt(choice || '') - 1;
            
            if (selectedIndex >= 0 && selectedIndex < employees.length) {
              const selectedEmployee = employees[selectedIndex];
              await assignManager(department.id, selectedEmployee.id, selectedEmployee.name);
            }
          } else {
            await assignManager(department.id, employees[0].id, employees[0].name);
          }
        } catch (error) {
          console.error('❌ Error assigning manager:', error);
          alert('Failed to assign manager');
        }
      }
    } else if (action === '3') {
      // Unassign manager
      if (confirm(`Unassign current manager from ${department.name}?`)) {
        try {
          const { error } = await supabaseAdmin
            .from('departments')
            .update({ 
              manager_id: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', department.id);

          if (error) throw error;
          alert('✅ Manager unassigned successfully');
        } catch (error) {
          console.error('❌ Error unassigning manager:', error);
          alert('Failed to unassign manager');
        }
      }
    }
  };

  // Helper function to assign manager
  const assignManager = async (departmentId: string, employeeId: string, employeeName: string) => {
    try {
      const { error } = await supabaseAdmin
        .from('departments')
        .update({ 
          manager_id: employeeId,
          updated_at: new Date().toISOString()
        })
        .eq('id', departmentId);

      if (error) throw error;
      alert(`✅ Successfully assigned ${employeeName} as department manager`);
    } catch (error) {
      throw error;
    }
  };

  // Enhanced delete function
  const handleDelete = async (department: Department) => {
    if (confirm(`Are you sure you want to delete "${department.name}"? This will remove the department but keep employees.`)) {
      try {
        const { error } = await supabaseAdmin
          .from('departments')
          .delete()
          .eq('id', department.id);

        if (error) throw error;
        alert('✅ Department deleted successfully');
      } catch (error) {
        console.error('❌ Error deleting department:', error);
        alert('Failed to delete department');
      }
    }
  };

 // Replace the existing handleViewDetails function with this:
const handleViewDetails = (department: Department) => {
  // Navigate to department details page instead of showing alert
  router.push(`/admin/departments/${department.id}`);
};

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.hod_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      key: 'name',
      label: 'Department',
      sortable: true,
    },
    {
      key: 'hod_name',
      label: 'HOD',
      sortable: true,
    },
    {
      key: 'total_employees',
      label: 'Total Employees',
      sortable: true,
    },
    {
      key: 'location',
      label: 'Location',
      sortable: true,
    },
    {
      key: 'created_at',
      label: 'Created Date',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit'
      })
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string) => (
        <Badge className={value === 'active' ? 'text-green-500' : 'bg-red-500 text-white'}>
          {value === 'active' ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value: any, row: Department) => (
        <div className="flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(row);
            }}
            className="text-[#ff9d00] cursor-pointer hover:text-[#ff9d00]/90 transition-colors"
            title="Edit Department"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row);
            }}
            className="text-red-400 hover:text-red-300 transition-colors"
            title="Delete Department"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleViewDetails(row);
            }}
            className="text-[#ff9d00] cursor-pointer hover:text-[#ff9d00]/90 transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-[#171717] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <SectionHeader
          title="Department Overview"
          actions={
            <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1 w-full">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search departments."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-[#1a1a1a] border-[#333333] text-white placeholder-gray-400"
                />
              </div>
            </div>
            <Button 
              className="bg-[#ff9d00] hover:bg-[#e68e00] text-black w-full sm:w-auto"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Department
            </Button>
          </div>
            // <Button 
            //   className="bg-[#ff9d00] hover:bg-[#e68e00] text-black"
            //   onClick={() => setShowAddForm(true)}
            // >
            //   <Plus className="w-4 h-4 mr-2" />
            //   Add Department
            // </Button>
          }
        />

        {/* Search and Filters */}
        {/* <div className="bg-[#111111] rounded-xl border border-[#333333] p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1 w-full">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search departments by name, location, or HOD..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-[#1a1a1a] border-[#333333] text-white placeholder-gray-400"
                />
              </div>
            </div>
            <Button 
              className="bg-[#ff9d00] hover:bg-[#e68e00] text-black w-full sm:w-auto"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Department
            </Button>
          </div>
        </div> */}

        {/* Add Department Form Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#111111] border border-[#333333] rounded-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-white mb-4">Add New Department</h3>
              <form onSubmit={handleAddDepartment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Department Name *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="bg-[#1a1a1a] border-[#333333] text-white"
                    placeholder="Enter department name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Location *
                  </label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="bg-[#1a1a1a] border-[#333333] text-white"
                    placeholder="Enter location"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Description
                  </label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="bg-[#1a1a1a] border-[#333333] text-white"
                    placeholder="Enter description (optional)"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                    className="bg-[#1a1a1a] border-[#333333] text-white hover:bg-[#252525]"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-[#ff9d00] hover:bg-[#e68e00] text-black"
                  >
                    Create Department
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Departments Table */}
        <DataTable
          columns={columns}
          data={filteredDepartments}
          loading={loading}
          emptyMessage={loading ? "Loading departments..." : "No departments found. Click 'Add Department' to create one."}
        />

        {/* Debug Info */}
        <div className="mt-4 text-xs text-gray-500">
          <div>Total departments: {departments.length}</div>
          <div>Filtered departments: {filteredDepartments.length}</div>
          <div>Loading: {loading ? 'Yes' : 'No'}</div>
        </div>
      </div>
    </div>
  );
}