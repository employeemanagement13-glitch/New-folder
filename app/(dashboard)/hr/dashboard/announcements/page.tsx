// app/hr/announcements/page.tsx (Updated with consistent UI)
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, RefreshCw, Eye, Edit, Trash2, Filter, Download } from 'lucide-react';
import { useAuth, useUser } from '@clerk/nextjs';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import DataTable from '@/Components/DataTable';
import FilterSelect from '@/Components/FilterSelect';
import SectionHeader from '@/Components/SectionHeader';
import StatCard from '@/Components/StatCard';
import AddNotificationModal from '@/Components/hr/announcements/AddNotificationModal';
import EditNotificationModal from '@/Components/hr/announcements/EditNotificationModal';
import ViewNotificationModal from '@/Components/hr/announcements/ViewNotificationModal';

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
  status: string;
}

interface Department {
  id: string;
  name: string;
}

export default function HRAnnouncementsPage() {
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
  const [error, setError] = useState<string>('');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Get user role from Clerk metadata
  const getUserRole = () => {
    if (!user) return 'Admin';
    
    // Get role from Clerk user metadata
    const role = user.publicMetadata?.role as string;
    const email = user.primaryEmailAddress?.emailAddress || 'HR User';
    
    if (role) {
      return `${role} (${email})`;
    }
    
    // Default to Admin for HR users
    return `Admin`;
  };

  // Simplified data fetching - no complex joins
  const fetchData = useCallback(async () => {
    if (!isLoaded) return;

    try {
      setRefreshing(true);
      setError('');

      // Fetch notifications - simple query without joins
      const { data: notificationsData, error: notificationsError } = await supabaseAdmin
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (notificationsError) {
        console.error('Notifications fetch error:', notificationsError);
        // If table doesn't exist, create sample data
        if (notificationsError.code === '42P01') {
          console.log('Notifications table does not exist yet');
          setNotifications([]);
          return;
        }
        throw notificationsError;
      }

      // Fetch departments for filter dropdown
      const { data: departmentsData, error: departmentsError } = await supabaseAdmin
        .from('departments')
        .select('id, name')
        .order('name');

      if (departmentsError) {
        console.error('Departments fetch error:', departmentsError);
        // If departments table doesn't exist, use empty array
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
  }, [isLoaded]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time subscription for updates
  useEffect(() => {
    if (!isLoaded) return;

    try {
      const subscription = supabaseAdmin
        .channel('notifications-realtime')
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'notifications' 
          },
          (payload) => {
            console.log('Real-time update:', payload);
            fetchData(); // Refresh data on any change
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    } catch (err) {
      console.error('Realtime subscription failed:', err);
    }
  }, [isLoaded, fetchData]);

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

    // Department filter
    if (filterDepartment) {
      filtered = filtered.filter(notification =>
        notification.target_department_id === filterDepartment
      );
    }

    // Type filter
    if (filterType) {
      filtered = filtered.filter(notification => notification.type === filterType);
    }

    // Status filter
    if (filterStatus) {
      filtered = filtered.filter(notification => notification.status === filterStatus);
    }

    setFilteredNotifications(filtered);
  }, [notifications, searchTerm, filterDepartment, filterType, filterStatus]);

  // Add these handler functions
  const handleView = (notification: any) => {
    setSelectedNotification(notification);
    setShowViewModal(true);
  };

  const handleEdit = (notification: any) => {
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
    setFilterDepartment('');
    setFilterType('');
    setFilterStatus('');
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm || filterDepartment || filterType || filterStatus;

  // Stats calculations
  const totalAnnouncements = notifications.length;
  const activeAnnouncements = notifications.filter(n => n.status === 'sent').length;
  const draftAnnouncements = notifications.filter(n => n.status === 'draft').length;
  const urgentAnnouncements = notifications.filter(n => n.priority === 'urgent').length;

  // Filter options
  const departmentOptions = [
    { value: '', label: 'All Departments' },
    ...departments.map(dept => ({
      value: dept.id,
      label: dept.name
    }))
  ];

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'alert', label: 'Alert' },
    { value: 'event', label: 'Event' },
    { value: 'notice', label: 'Notice' },
    { value: 'announcement', label: 'Announcement' },
    { value: 'payroll', label: 'Payroll' },
    { value: 'leave', label: 'Leave' }
  ];

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'sent', label: 'Sent' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'draft', label: 'Draft' },
    { value: 'failed', label: 'Failed' },
    { value: 'cancelled', label: 'Cancelled' }
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
          value === 'payroll' ? 'bg-green-500/20 text-green-400' :
          value === 'leave' ? 'bg-orange-500/20 text-orange-400' :
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
        
        // Find department name from our departments list
        if (row.target_department_id) {
          const department = departments.find(dept => dept.id === row.target_department_id);
          return department ? department.name : 'Specific Department';
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
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string) => (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          value === 'sent' ? 'bg-green-500/20 text-green-400' :
          value === 'scheduled' ? 'bg-blue-500/20 text-blue-400' :
          value === 'draft' ? 'bg-gray-500/20 text-gray-400' :
          value === 'failed' ? 'bg-red-500/20 text-red-400' :
          'bg-gray-400/20 text-gray-400'
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
            className="px-3 py-1 bg-[#ff9d00] text-black text-xs rounded-lg hover:bg-[#ff9d00]/90 transition-colors font-medium"
          >
            View
          </button>
          <button
            onClick={() => handleEdit(row)}
            className="px-3 py-1 bg-[#ff9d00] text-black text-xs rounded-lg hover:bg-[#ff9d00]/90 transition-colors font-medium"
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="px-3 py-1 bg-[#ff9d00] text-black text-xs rounded-lg hover:bg-[#ff9d00]/90 transition-colors font-medium"
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

  return (
    <div className="min-h-screen bg-[#171717] text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-full mx-auto">
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title="Total Announcements" 
            value={totalAnnouncements} 
          />
          <StatCard 
            title="Active" 
            value={activeAnnouncements} 
          />
          <StatCard 
            title="Drafts" 
            value={draftAnnouncements} 
          />
          <StatCard 
            title="Urgent" 
            value={urgentAnnouncements} 
          />
        </div>

        {/* Announcements Management Section */}
        <div className="mb-8">
          <SectionHeader
            title="Announcements"
            description=""
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

                {/* Department Filter */}
                <FilterSelect
                  options={departmentOptions}
                  value={filterDepartment}
                  onChange={setFilterDepartment}
                  icon={<Filter size={16} />}
                  placeholder="All Departments"
                />

                {/* Type Filter */}
                <FilterSelect
                  options={typeOptions}
                  value={filterType}
                  onChange={setFilterType}
                  icon={<Filter size={16} />}
                  placeholder="All Types"
                />

                {/* Status Filter */}
                <FilterSelect
                  options={statusOptions}
                  value={filterStatus}
                  onChange={setFilterStatus}
                  icon={<Filter size={16} />}
                  placeholder="All Status"
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
              emptyMessage="No announcements found for the selected filters."
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
        />
      )}
    </div>
  );
}