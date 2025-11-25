// app/admin/roles/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import SectionHeader from '@/Components/SectionHeader';
import DataTable from '@/Components/DataTable';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Textarea } from '@/Components/ui/textarea';
import { Checkbox } from '@/Components/ui/checkbox';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/Components/ui/select';
import { Edit, Trash2, Eye, Plus, Save, X, Users, Search, Filter, InspectionPanel } from 'lucide-react';

interface Role {
  id: string;
  role_name: string;
  description: string;
  created_at: string;
  updated_at?: string;
}

interface Employee {
  id: string;
  name: string;
  employee_id: string;
  role_id: string;
  department_id: string;
  department: {
    name: string;
  };
  role: {
    role_name: string;
    description: string;
  };
}

interface RolePermission {
  id: string;
  role_id: string;
  module: string; // Changed from permission_type to module
  can_view: boolean;
  can_add: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface RoleForm {
  role_name: string;
  description: string;
}

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

// Permission types based on your image - using module names
const PERMISSION_MODULES = ['HR', 'HOD', 'Manager', 'Employee'];

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [permissionData, setPermissionData] = useState<Record<string, any>>({});
  const [savePermissionLoading, setSavePermissionLoading] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  
  const [formData, setFormData] = useState<RoleForm>({
    role_name: '',
    description: ''
  });

  const supabase = supabaseAdmin;

  // Helper function to get permissions for a specific role
  const getPermissionsForRole = (roleId: string): string[] => {
    if (!roleId) return [];
    
    // Get all permissions for this role
    const permissions = rolePermissions.filter(rp => rp.role_id === roleId);
    
    if (permissions.length === 0) return ['None'];
    
    // Check if this role has all permissions across all modules
    const hasFullAccess = permissions.every(perm => 
      perm.can_view && perm.can_add && perm.can_edit && perm.can_delete
    );
    
    if (hasFullAccess) {
      return ['Full Access'];
    }
    
    // Check if role has any permissions at all
    const hasAnyPermission = permissions.some(perm => 
      perm.can_view || perm.can_add || perm.can_edit || perm.can_delete
    );
    
    if (!hasAnyPermission) {
      return ['None'];
    }
    
    // Collect unique permission types that are granted
    const permissionSet = new Set<string>();
    
    permissions.forEach(perm => {
      if (perm.can_view) permissionSet.add('View');
      if (perm.can_add) permissionSet.add('Add');
      if (perm.can_edit) permissionSet.add('Edit');
      if (perm.can_delete) permissionSet.add('Delete');
    });

    return Array.from(permissionSet);
  };

  // Get permissions display for table
  const getPermissionsBadge = (roleId: string) => {
    const permissions = getPermissionsForRole(roleId);
    
    if (permissions.includes('Full Access')) {
      return <Badge className="bg-green-500 text-white">Full Access</Badge>;
    }
    
    if (permissions.includes('None')) {
      return <Badge className="bg-gray-500 text-white">No Permissions</Badge>;
    }

    return (
      <div className="flex flex-wrap gap-1">
        {permissions.map((perm, index) => (
          <Badge key={index} className="bg-blue-500 text-white text-xs">
            {perm}
          </Badge>
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  useEffect(() => {
    fetchAllData();
    
    // Set up real-time subscriptions
    const rolesChannel = supabase
      .channel('roles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'roles'
        },
        () => {
          fetchRoles();
        }
      )
      .subscribe();

    const employeesChannel = supabase
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

    const permissionsChannel = supabase
      .channel('role-permissions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'role_permissions'
        },
        () => {
          fetchRolePermissions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(rolesChannel);
      supabase.removeChannel(employeesChannel);
      supabase.removeChannel(permissionsChannel);
    };
  }, []);

  // Load permissions when selected role changes
  useEffect(() => {
    if (selectedRole) {
      loadPermissionsForRole(selectedRole.id);
    }
  }, [selectedRole, rolePermissions]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchRoles(),
        fetchEmployees(),
        fetchRolePermissions()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setRoles(data);
        // Auto-select first role if none selected
        if (data.length > 0 && !selectedRole) {
          setSelectedRole(data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      // Use separate queries to avoid relationship conflicts
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .order('name', { ascending: true });

      if (employeesError) throw employeesError;

      if (!employeesData) {
        setEmployees([]);
        return;
      }

      // Get department names
      const { data: departmentsData } = await supabase
        .from('departments')
        .select('id, name');

      // Get role names
      const { data: rolesData } = await supabase
        .from('roles')
        .select('id, role_name, description');

      // Combine data manually
      const combinedEmployees = employeesData.map(employee => {
        const department = departmentsData?.find(dept => dept.id === employee.department_id);
        const role = rolesData?.find(role => role.id === employee.role_id);
        
        return {
          ...employee,
          department: department ? { name: department.name } : { name: 'No Department' },
          role: role ? { role_name: role.role_name, description: role.description } : { role_name: 'No Role', description: '' }
        };
      });

      setEmployees(combinedEmployees);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchRolePermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*');

      if (error) {
        console.error('Error fetching role permissions:', error);
        return;
      }

      setRolePermissions(data as RolePermission[]);
    } catch (error) {
      console.error('Error in fetchRolePermissions:', error);
    }
  };

  const loadPermissionsForRole = (roleId: string) => {
    const permissions = rolePermissions.filter(rp => rp.role_id === roleId);
    const permissionObj: Record<string, any> = {};
    
    // Initialize with default permissions for all modules
    PERMISSION_MODULES.forEach(module => {
      const rolePermission = permissions.find(p => p.module === module);
      permissionObj[module] = {
        view: rolePermission?.can_view || false,
        add: rolePermission?.can_add || false,
        edit: rolePermission?.can_edit || false,
        delete: rolePermission?.can_delete || false
      };
    });
    
    setPermissionData(permissionObj);
  };

  // Get unique departments and roles for filters
  const departments = [...new Set(employees.map(emp => emp.department?.name).filter(Boolean))];
  const roleNames = [...new Set(employees.map(emp => emp.role?.role_name).filter(Boolean))];

  // Filter roles based on search
  const filteredRoles = roles.filter(role => {
    const matchesSearch = role.role_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         role.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || role.role_name === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  // Create table data - Show individual employees with their roles and departments
  const employeeBasedData = filteredRoles.flatMap(role => {
    const employeesWithRole = employees.filter(emp => emp.role_id === role.id);
    
    // If no employees have this role, still show the role
    if (employeesWithRole.length === 0) {
      return [{
        id: `${role.id}-no-employee`,
        role_id: role.id,
        role_name: role.role_name,
        description: role.description,
        employee_name: 'No employees assigned',
        employee_department: 'No department',
        permissions: getPermissionsForRole(role.id),
        created_at: role.created_at,
        employee_count: 0
      }];
    }
    
    // Return one row per employee with this role
    return employeesWithRole.map(employee => ({
      id: `${role.id}-${employee.id}`,
      role_id: role.id,
      role_name: role.role_name,
      description: role.description,
      employee_name: employee.name,
      employee_department: employee.department?.name || 'No department',
      permissions: getPermissionsForRole(role.id),
      created_at: role.created_at,
      employee_count: employeesWithRole.length
    }));
  });

  const handleInputChange = (field: keyof RoleForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePermissionChange = (module: string, permission: string, checked: boolean) => {
    setPermissionData(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [permission]: checked
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);

      const roleData = {
        role_name: formData.role_name,
        description: formData.description,
        updated_at: new Date().toISOString()
      };

      let roleId: string;

      if (editingRole) {
        // Update existing role
        const { data, error } = await supabase
          .from('roles')
          .update(roleData)
          .eq('id', editingRole.id)
          .select()
          .single();

        if (error) throw error;
        if (!data) throw new Error('No data returned after update');
        
        roleId = editingRole.id;
      } else {
        // Create new role
        const { data, error } = await supabase
          .from('roles')
          .insert([roleData])
          .select()
          .single();

        if (error) throw error;
        if (!data) throw new Error('No data returned after insert');
        
        roleId = data.id;
      }

      // Save permissions for the new/updated role
      await savePermissions(roleId);

      // Reset form and state
      setFormData({
        role_name: '',
        description: ''
      });
      setEditingRole(null);
      setShowForm(false);

      alert(`Role ${editingRole ? 'updated' : 'created'} successfully!`);

    } catch (error: any) {
      console.error('Error saving role:', error);
      alert(`Error saving role: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const savePermissions = async (roleId: string) => {
    try {
      const permissionsToSave = PERMISSION_MODULES.map(module => ({
        role_id: roleId,
        module: module, // Use 'module' instead of 'permission_type'
        can_view: permissionData[module]?.view || false,
        can_add: permissionData[module]?.add || false,
        can_edit: permissionData[module]?.edit || false,
        can_delete: permissionData[module]?.delete || false
      }));

      console.log('Saving permissions:', permissionsToSave);

      // Delete existing permissions for this role
      const { error: deleteError } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId);

      if (deleteError) {
        console.error('Delete error:', deleteError);
        // Continue anyway - might be no permissions to delete
      }

      // Insert new permissions using the correct column name 'module'
      const { error: insertError } = await supabase
        .from('role_permissions')
        .insert(permissionsToSave);

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      // Refresh permissions data
      await fetchRolePermissions();

    } catch (error) {
      console.error('Error saving permissions:', error);
      throw error;
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    
    try {
      setSavePermissionLoading(true);
      await savePermissions(selectedRole.id);
      alert('Permissions saved successfully!');
      
      // Force refresh of table data to show updated permissions
      await fetchRolePermissions();
      
    } catch (error: any) {
      console.error('Error saving permissions:', error);
      alert(`Error saving permissions: ${error.message}`);
    } finally {
      setSavePermissionLoading(false);
    }
  };

  const handleEdit = (roleData: any) => {
    const role = roles.find(r => r.id === roleData.role_id);
    if (role) {
      setEditingRole(role);
      setFormData({
        role_name: role.role_name,
        description: role.description
      });
      setSelectedRole(role);
      setShowForm(true);
    }
  };

  const handleDelete = async (roleData: any) => {
    if (!confirm(`Are you sure you want to delete the role "${roleData.role_name}"? This will affect ${roleData.employee_count} employees.`)) {
      return;
    }

    try {
      // First, check if there are employees using this role
      const { data: employeesWithRole } = await supabase
        .from('employees')
        .select('id')
        .eq('role_id', roleData.role_id);

      if (employeesWithRole && employeesWithRole.length > 0) {
        alert(`Cannot delete role. ${employeesWithRole.length} employees are still assigned to this role. Please reassign them first.`);
        return;
      }

      // Delete permissions first
      const { error: permissionsError } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleData.role_id);

      if (permissionsError) throw permissionsError;

      // Then delete the role
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleData.role_id);

      if (error) throw error;

      alert('Role deleted successfully!');

    } catch (error: any) {
      console.error('Error deleting role:', error);
      alert(`Error deleting role: ${error.message}`);
    }
  };

  const handleView = (roleData: any) => {
    const role = roles.find(r => r.id === roleData.role_id);
    if (role) {
      setSelectedRole(role);
      setShowForm(false);
    }
  };

  const handleNewRole = () => {
    setEditingRole(null);
    setFormData({
      role_name: '',
      description: ''
    });
    setPermissionData({});
    setShowForm(true);
  };

  // Define columns for DataTable - Updated to show employee names and departments
  const columns = [
    {
      key: 'role_id',
      label: 'Role ID',
      sortable: true,
      render: (value: string, row: any) => (
        <div className="text-white font-mono text-sm">{row.role_id}</div>
      )
    },
    {
      key: 'employee_name',
      label: 'Employee Name',
      sortable: true,
      render: (value: string, row: any) => (
        <div>
          <div className="font-medium text-white">{value}</div>
          <div className="text-sm text-gray-400">{row.description}</div>
        </div>
      )
    },
    {
      key: 'employee_department',
      label: 'Department',
      sortable: true,
      render: (value: string) => (
        <span className="text-white">{value}</span>
      )
    },
    {
      key: 'permissions',
      label: 'Permissions',
      sortable: false,
      render: (value: any, row: any) => getPermissionsBadge(row.role_id)
    },
    {
      key: 'created_at',
      label: 'Created At',
      sortable: true,
      render: (value: string) => (
        <span className="text-white">{formatDate(value)}</span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (value: any, row: any) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(row)}
            className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row)}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
            disabled={row.employee_count > 0}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleView(row)}
            className="text-green-400 hover:text-green-300 hover:bg-green-500/20"
          >
            <InspectionPanel className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-[#171717] p-6">
      <div className="max-w-7xl mx-auto">
        <SectionHeader 
          title="Role Management"
          description="Manage user roles and permissions across the system"
          actions={
            <Button
              onClick={handleNewRole}
              className="bg-[#ff9d00] hover:bg-[#ff9d00]/90 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Role
            </Button>
          }
        />

        {/* Role Form */}
        {showForm && (
          <div className="bg-[#111111] rounded-xl border border-[#333333] p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">
                {editingRole ? 'Edit Role' : 'Add New Role'}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Role Name</label>
                  <Input
                    value={formData.role_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('role_name', e.target.value)}
                    placeholder="Enter role name"
                    className="bg-[#1a1a1a] border-[#333333] text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Employee Count</label>
                  <Input
                    value={editingRole ? employees.filter(emp => emp.role_id === editingRole.id).length : 0}
                    disabled
                    className="bg-[#1a1a1a] border-[#333333] text-gray-400"
                  />
                  <p className="text-xs text-gray-400">Automatically calculated</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('description', e.target.value)}
                  placeholder="Enter role description"
                  className="bg-[#1a1a1a] border-[#333333] text-white min-h-[80px]"
                  required
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#ff9d00] hover:bg-[#ff9d00]/90 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {submitting ? 'Saving...' : (editingRole ? 'Update Role' : 'Create Role')}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="bg-[#111111] rounded-xl border border-[#333333] p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-400 mb-2 block">Search</label>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <Input
                  placeholder="Search by employee name, role, or department..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="bg-[#1a1a1a] border-[#333333] text-white pl-10"
                />
              </div>
            </div>
            
            <div className="w-full lg:w-48">
              <label className="text-sm font-medium text-gray-400 mb-2 block">Role</label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="bg-[#1a1a1a] border-[#333333] text-white">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#333333] text-white">
                  <SelectItem value="all">All Roles</SelectItem>
                  {roleNames.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full lg:w-48">
              <label className="text-sm font-medium text-gray-400 mb-2 block">Department</label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="bg-[#1a1a1a] border-[#333333] text-white">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#333333] text-white">
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setDepartmentFilter('all');
                setRoleFilter('all');
              }}
              className="border-[#333333] text-gray-400 hover:text-white hover:bg-[#333333]"
            >
              <Filter className="w-4 h-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Roles Table - Updated to use employee-based data */}
        <DataTable
          columns={columns}
          data={employeeBasedData}
          loading={loading}
          emptyMessage="No roles found. Create your first role to get started."
          className="mb-8"
        />

        {/* Permissions Section - Updated to match your image with table layout */}
        <div className="bg-[#111111] rounded-xl border border-[#333333] p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Permissions</h3>
              <p className="text-sm text-gray-400 mt-1">
                {selectedRole 
                  ? `Managing permissions for role: ${selectedRole.role_name}` 
                  : 'Select a role to manage permissions'}
              </p>
            </div>
            
            {selectedRole && (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-400">
                  {employees.filter(emp => emp.role_id === selectedRole.id).length} employees
                </span>
                <Button
                  onClick={handleSavePermissions}
                  disabled={savePermissionLoading}
                  className="bg-[#ff9d00] hover:bg-[#ff9d00]/90 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {savePermissionLoading ? 'Saving...' : 'Save Permissions'}
                </Button>
              </div>
            )}
          </div>

          {/* Permissions Table - Matching your image design */}
          <div className="bg-[#1a1a1a] rounded-lg border border-[#333333] overflow-hidden">
            {selectedRole ? (
              <div className="p-6">
                <div className="mb-4">
                  <h4 className="text-white font-medium mb-2">Role Name: {selectedRole.role_name}</h4>
                  <p className="text-sm text-gray-400">
                    Each Role Permissions Provided From Here
                  </p>
                </div>

                <div className="border border-[#333333] rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#252525] border-b border-[#333333]">
                        <th className="text-left p-4 text-gray-400 font-normal">Permissions</th>
                        <th className="text-center p-4 text-gray-400 font-normal">View</th>
                        <th className="text-center p-4 text-gray-400 font-normal">Add</th>
                        <th className="text-center p-4 text-gray-400 font-normal">Edit</th>
                        <th className="text-center p-4 text-gray-400 font-normal">Delete</th>
                      </tr>
                    </thead>
                    <tbody>
                      {PERMISSION_MODULES.map((module, index) => (
                        <tr 
                          key={module} 
                          className={`border-b border-[#333333] ${index % 2 === 0 ? 'bg-[#1a1a1a]' : 'bg-[#202020]'}`}
                        >
                          <td className="p-4 text-white font-medium">{module}</td>
                          <td className="p-4 text-center">
                            <Checkbox
                              checked={permissionData[module]?.view || false}
                              onCheckedChange={(checked: boolean) => 
                                handlePermissionChange(module, 'view', checked as boolean)
                              }
                              className="data-[state=checked]:bg-[#ff9d00] data-[state=checked]:border-[#ff9d00]"
                            />
                          </td>
                          <td className="p-4 text-center">
                            <Checkbox
                              checked={permissionData[module]?.add || false}
                              onCheckedChange={(checked: boolean) => 
                                handlePermissionChange(module, 'add', checked as boolean)
                              }
                              className="data-[state=checked]:bg-[#ff9d00] data-[state=checked]:border-[#ff9d00]"
                            />
                          </td>
                          <td className="p-4 text-center">
                            <Checkbox
                              checked={permissionData[module]?.edit || false}
                              onCheckedChange={(checked: boolean) => 
                                handlePermissionChange(module, 'edit', checked as boolean)
                              }
                              className="data-[state=checked]:bg-[#ff9d00] data-[state=checked]:border-[#ff9d00]"
                            />
                          </td>
                          <td className="p-4 text-center">
                            <Checkbox
                              checked={permissionData[module]?.delete || false}
                              onCheckedChange={(checked: boolean) => 
                                handlePermissionChange(module, 'delete', checked as boolean)
                              }
                              className="data-[state=checked]:bg-[#ff9d00] data-[state=checked]:border-[#ff9d00]"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Quick Actions */}
                <div className="flex justify-center space-x-4 mt-6">
                  <Button
                    onClick={() => {
                      const newData: any = {};
                      PERMISSION_MODULES.forEach(module => {
                        newData[module] = { view: true, add: true, edit: true, delete: true };
                      });
                      setPermissionData(newData);
                    }}
                    variant="outline"
                    className="border-green-500 text-green-500 hover:bg-green-500/20"
                  >
                    Select All Permissions
                  </Button>
                  <Button
                    onClick={() => {
                      const newData: any = {};
                      PERMISSION_MODULES.forEach(module => {
                        newData[module] = { view: false, add: false, edit: false, delete: false };
                      });
                      setPermissionData(newData);
                    }}
                    variant="outline"
                    className="border-red-500 text-red-500 hover:bg-red-500/20"
                  >
                    Clear All Permissions
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-500 mb-4">
                  <Users className="w-12 h-12 mx-auto" />
                </div>
                <p className="text-gray-400">Select a role from the table above to manage permissions</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}