// app/department-manager/announcements/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, RefreshCw, Eye, Edit, Trash2, Filter, Download } from 'lucide-react';
import { useAuth, useUser } from '@clerk/nextjs';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import DataTable from '@/Components/DataTable';
import FilterSelect from '@/Components/FilterSelect';
import SectionHeader from '@/Components/SectionHeader';
import AddNotificationModal from '@/Components/manager/AddNotificationModal';
import EditNotificationModal from '@/Components/manager/EditNotificationModal';
import ViewNotificationModal from '@/Components/manager/ViewNotificationModal';
import { useParams } from 'next/navigation';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  target_audience: string;
  target_department_id?: string;
  created_by: string;
  created_at: string;
  expiry_date: string | null;
  delivery_method: string;
}

interface Department {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  department_id: string;
  name: string;
  email: string;
}

export default function DepartmentManagerAnnouncementsPage() {
      const params = useParams();
      const empId = (params.id) as string;
  const { isLoaded, userId } = useAuth();
  const { user } = useUser();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [currentUserDepartment, setCurrentUserDepartment] = useState<string>('');
  const [currentUserDepartmentName, setCurrentUserDepartmentName] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');

  // Get current manager's department
  const getCurrentUserDepartment = useCallback(async () => {
    if (!user || !userId) return;

    try {
      // Get user from employees table using clerk_user_id
      const { data: employeeData, error: employeeError } = await supabaseAdmin
        .from('employees')
        .select('id, department_id, name, email')
        .eq('id', empId)
        .single();

      if (employeeError) {
        console.error('Employee fetch error:', employeeError);
        // Try alternative approach - get by email
        const userEmail = user.primaryEmailAddress?.emailAddress;
        if (userEmail) {
          const { data: emailEmployeeData } = await supabaseAdmin
            .from('employees')
            .select('id, department_id, name, email')
            .eq('email', userEmail)
            .single();
          
          if (emailEmployeeData) {
            setCurrentUserDepartment(emailEmployeeData.department_id);
            // Get department name
            const { data: deptData } = await supabaseAdmin
              .from('departments')
              .select('name')
              .eq('id', emailEmployeeData.department_id)
              .single();
            
            if (deptData) {
              setCurrentUserDepartmentName(deptData.name);
            }
            return;
          }
        }
        throw new Error('Could not find employee record');
      }

      if (employeeData) {
        setCurrentUserDepartment(employeeData.department_id);
        
        // Get department name
        const { data: deptData } = await supabaseAdmin
          .from('departments')
          .select('name')
          .eq('id', employeeData.department_id)
          .single();
        
        if (deptData) {
          setCurrentUserDepartmentName(deptData.name);
        }
      }
    } catch (err: any) {
      console.error('Department fetch failed:', err);
      setError('Could not determine your department. Please contact HR.');
    }
  }, [user, userId]);

  // Get user role from Clerk metadata
  const getUserRole = () => {
    if (!user) return 'Department Manager';
    
    // Get role from Clerk user metadata
    const role = user.publicMetadata?.role as string;
    const email = user.primaryEmailAddress?.emailAddress || 'Department Manager';
    
    if (role) {
      return `${role} (${email})`;
    }
    
    return `Department Manager`;
  };

  // Fetch data with department filtering
  const fetchData = useCallback(async () => {
    if (!isLoaded || !currentUserDepartment) return;

    try {
      setRefreshing(true);
      setError('');

      // Fetch notifications - only for current user's department or all
      const { data: notificationsData, error: notificationsError } = await supabaseAdmin
        .from('notifications')
        .select('*')
        .or(`target_department_id.eq.${currentUserDepartment},target_audience.eq.all`)
        .order('created_at', { ascending: false });

      if (notificationsError) {
        console.error('Notifications fetch error:', notificationsError);
        if (notificationsError.code === '42P01') {
          console.log('Notifications table does not exist yet');
          setNotifications([]);
          return;
        }
        throw notificationsError;
      }

      // Fetch departments for reference (all departments for modal dropdown)
      const { data: departmentsData, error: departmentsError } = await supabaseAdmin
        .from('departments')
        .select('id, name')
        .order('name');

      if (departmentsError) {
        console.error('Departments fetch error:', departmentsError);
        setDepartments([]);
      } else {
        setDepartments(departmentsData || []);
      }

      setNotifications(notificationsData || []);
      
    } catch (err: any) {
      console.error('Data fetch failed:', err);
      setError(err.message || 'Failed to load data');
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isLoaded, currentUserDepartment]);

  // Get user department on initial load
  useEffect(() => {
    if (isLoaded && user) {
      getCurrentUserDepartment();
    }
  }, [isLoaded, user, getCurrentUserDepartment]);

  // Fetch data when department is available
  useEffect(() => {
    if (currentUserDepartment) {
      fetchData();
    }
  }, [currentUserDepartment, fetchData]);

  // Real-time subscription for updates
  useEffect(() => {
    if (!isLoaded || !currentUserDepartment) return;

    try {
      const subscription = supabaseAdmin
        .channel('department-notifications-realtime')
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'notifications',
            filter: `target_department_id=eq.${currentUserDepartment}`
          },
          (payload) => {
            console.log('Real-time department update:', payload);
            fetchData();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    } catch (err) {
      console.error('Realtime subscription failed:', err);
    }
  }, [isLoaded, currentUserDepartment, fetchData]);

  // Filter notifications
  useEffect(() => {
    let filtered = notifications;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(notification =>
        notification.title.toLowerCase().includes(term) ||
        notification.message.toLowerCase().includes(term) ||
        notification.created_by.toLowerCase().includes(term)
      );
    }

    // Type filter
    if (filterType) {
      filtered = filtered.filter(notification => notification.type === filterType);
    }

    setFilteredNotifications(filtered);
  }, [notifications, searchTerm, filterType]);

  // Handler functions
  const handleView = (notification: any) => {
    setSelectedNotification(notification);
    setShowViewModal(true);
  };

  const handleEdit = (notification: any) => {
    // Only allow editing notifications from current department
    if (notification.target_department_id !== currentUserDepartment) {
      alert('You can only edit announcements from your own department.');
      return;
    }
    setSelectedNotification(notification);
    setShowEditModal(true);
  };

  const handleDelete = async (notificationId: string) => {
    if (!confirm('Are you sure you want to delete this announcement? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      // Optimistic update
      setNotifications(prev => 
        prev.filter(notification => notification.id !== notificationId)
      );
      
    } catch (err: any) {
      console.error('Delete failed:', err);
      alert(`Failed to delete announcement: ${err.message}`);
    }
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('');
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm || filterType;

  // Filter options
  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'alert', label: 'Alert' },
    { value: 'event', label: 'Event' },
    { value: 'notice', label: 'Notice' },
    { value: 'announcement', label: 'Announcement' },
    { value: 'department', label: 'Department' }
  ];

  // Table columns
  const notificationColumns = [
    {
      key: 'title',
      label: 'Title',
      sortable: true,
      render: (value: string, row: Notification) => (
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-white truncate">
            {value}
            {row.target_department_id === currentUserDepartment && (
              <span className="ml-2 text-xs text-[#ff9d00] bg-[#ff9d00]/10 px-2 py-1 rounded-full">
                My Department
              </span>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'message',
      label: 'Message',
      sortable: true,
      render: (value: string, row: Notification) => (
        <div className="min-w-0 flex-1">
          <div className="text-white truncate max-w-md">
            {row.message}
          </div>
        </div>
      )
    },
    {
      key: 'posted by',
      label: 'Posted By',
      sortable: true,
      render: (value: string, row: Notification) => (
        <div className="min-w-0 flex-1">
          <div className="text-white mt-1">
            By {row.created_by}
          </div>
        </div>
      )
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (value: string) => (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          value === 'alert' ? 'bg-red-500/20 text-red-400' :
          value === 'event' ? 'bg-blue-500/20 text-blue-400' :
          value === 'notice' ? 'bg-purple-500/20 text-purple-400' :
          value === 'department' ? 'bg-[#ff9d00]/20 text-[#ff9d00]' :
          'bg-cyan-500/20 text-cyan-400'
        }`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      )
    },
    {
      key: 'target_audience',
      label: 'Audience',
      sortable: true,
      render: (value: string, row: Notification) => {
        if (value === 'all') return 'All Employees';
        
        if (row.target_department_id) {
          if (row.target_department_id === currentUserDepartment) {
            return `${currentUserDepartmentName} (My Department)`;
          }
          const department = departments.find(dept => dept.id === row.target_department_id);
          return department ? department.name : 'Other Department';
        }
        
        return 'Specific Audience';
      }
    },
    {
      key: 'priority',
      label: 'Priority',
      sortable: true,
      render: (value: string) => (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          value === 'urgent' ? 'bg-red-500/20 text-red-400' :
          value === 'high' ? 'bg-orange-500/20 text-orange-400' :
          value === 'normal' ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-green-500/20 text-green-400'
        }`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      )
    },
    {
      key: 'delivery_method',
      label: 'Delivery',
      sortable: true,
      render: (value: string) => {
        switch (value) {
          case 'email': return 'Email';
          case 'push': return 'Push Notification';
          case 'both': return 'Email & Push';
          default: return value;
        }
      }
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (value: string) => (
        <span className="text-gray-300">
          {new Date(value).toLocaleDateString('en-GB')}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value: any, row: Notification) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleView(row)}
            className="px-3 py-1 bg-[#ff9d00] hover:bg-[#e68e00] text-black text-xs rounded-lg transition-colors font-medium"
          >
            View
          </button>
          <button
            onClick={() => handleEdit(row)}
            disabled={row.target_department_id !== currentUserDepartment}
            className={`px-3 py-1 text-black text-xs rounded-lg transition-colors font-medium ${
              row.target_department_id === currentUserDepartment 
                ? 'bg-[#ff9d00] hover:bg-[#e68e00]' 
                : 'bg-gray-600 cursor-not-allowed opacity-50'
            }`}
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            disabled={row.target_department_id !== currentUserDepartment}
            className={`px-3 py-1 text-black text-xs rounded-lg transition-colors font-medium ${
              row.target_department_id === currentUserDepartment 
                ? 'bg-[#ff9d00] hover:bg-[#e68e00]' 
                : 'bg-gray-600 cursor-not-allowed opacity-50'
            }`}
          >
            Delete
          </button>
        </div>
      )
    }
  ];

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#171717] flex items-center justify-center">
        <div className="text-white text-xl">Loading Announcements...</div>
      </div>
    );
  }

  if (!currentUserDepartment && !loading) {
    return (
      <div className="min-h-screen bg-[#171717] flex items-center justify-center">
        <div className="text-white text-xl text-center">
          <div>Unable to determine your department.</div>
          <div className="text-sm text-gray-400 mt-2">Please contact HR to ensure your employee record is properly set up.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#171717] text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-full mx-auto">

        {/* Announcements Management Section */}
        <div className="mb-8">
          <SectionHeader
            title="Announcements"
            description={`Viewing announcements for ${currentUserDepartmentName} and company-wide announcements`}
            actions={
              <div className="flex flex-col items-center justify-center sm:flex-row gap-3 w-full sm:w-auto">
                {/* Search Input */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search announcements..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-64 p-2 pl-10 rounded-lg bg-black border border-[#333333] text-white text-sm"
                  />
                  <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>

                {/* Type Filter */}
                <FilterSelect
                  options={typeOptions}
                  value={filterType}
                  onChange={setFilterType}
                  icon={<Filter size={16} />}
                  placeholder="All Types"
                />


                {/* Clear Filters Button */}
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 bg-transparent hover:bg-[#1a1a1a] text-white border border-[#333333] rounded-lg text-sm font-medium transition-colors"
                  >
                    Clear Filters
                  </button>
                )}

                {/* Refresh Button */}
                <button
                  onClick={fetchData}
                  disabled={refreshing}
                  className="flex items-center gap-2 px-4 py-2 bg-[#ff9d00] hover:bg-[#e68e00] text-black rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>

                {/* Create Announcement Button */}
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#ff9d00] hover:bg-[#e68e00] text-black rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus size={16} />
                  Create
                </button>
              </div>
            }
          />

          {/* Announcements Table */}
          <div className="bg-[#111111] rounded-xl border border-[#333333] overflow-hidden">
            <DataTable
              columns={notificationColumns}
              data={filteredNotifications}
              loading={loading && filteredNotifications.length === 0}
              emptyMessage="No announcements found for your department."
              className="min-h-fit"
            />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl mb-6">
            <div className="flex justify-between items-center">
              <span>{error}</span>
              <button 
                onClick={() => setError('')}
                className="text-red-400 hover:text-red-300 text-lg font-bold"
              >
                ×
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Modals */}
      {showAddModal && (
        <AddNotificationModal
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchData}
          departments={departments}
          currentUser={user}
          userRole={getUserRole()}
          managerDepartmentId={currentUserDepartment}
          managerDepartmentName={currentUserDepartmentName}
        />
      )}

      {showViewModal && selectedNotification && (
        <ViewNotificationModal
          notification={selectedNotification}
          onClose={() => setShowViewModal(false)}
          onEdit={() => {
            setShowViewModal(false);
            handleEdit(selectedNotification);
          }}
          canEdit={selectedNotification.target_department_id === currentUserDepartment}
        />
      )}

      {showEditModal && selectedNotification && (
        <EditNotificationModal
          notification={selectedNotification}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            fetchData();
          }}
          departments={departments}
          userRole={getUserRole()}
          managerDepartmentId={currentUserDepartment}
          managerDepartmentName={currentUserDepartmentName}
        />
      )}
    </div>
  );
}