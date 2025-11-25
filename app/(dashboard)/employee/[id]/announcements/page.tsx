// app/employees/[empId]/announcements/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import FilterSelect from '@/Components/FilterSelect';
import DataTable from '@/Components/DataTable';
import SectionHeader from '@/Components/SectionHeader';
import { Button } from '@/Components/ui/button';

interface Announcement {
  id: string;
  title: string;
  message: string;
  created_at: string;
  audience: string;
  type: string;
  priority: string;
  scheduled_for: string;
  expiry_date: string;
  created_by: string;
  target_audience: string;
  target_department_id: string;
}

interface Employee {
  id: string;
  department_id: string;
  name: string;
  email: string;
}

interface Department {
  id: string;
  name: string;
}

// Calendar icon component - moved outside to prevent re-rendering
const CalendarIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="w-4 h-4 text-white"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
    />
  </svg>
);

// Year input with up/down controls - moved outside to prevent re-rendering
const YearInput = ({ selectedYear, setSelectedYear }: { selectedYear: string; setSelectedYear: (year: string) => void }) => (
  <div className="relative">
    <input
      type="number"
      placeholder="Year"
      value={selectedYear}
      onChange={(e) => setSelectedYear(e.target.value)}
      min="2020"
      max="2030"
      className="w-full sm:w-24 p-2 rounded-lg bg-black border border-[#333333] text-white text-sm"
    />
  </div>
);

export default function AnnouncementsPage() {
  const params = useParams();
  const empId = params.id as string;

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState<Announcement[]>([]);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter states
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  // Filter options
  const monthOptions = [
    { value: '', label: 'All Months' },
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  // Fetch employee and department data
  const fetchEmployeeData = async () => {
    try {
      // First get employee data
      const { data: employeeData, error: employeeError } = await supabaseAdmin
        .from('employees')
        .select('id, department_id, name, email')
        .eq('id', empId)
        .single();

      if (employeeError) throw employeeError;
      setEmployee(employeeData);

      // Then get department data if employee has a department
      if (employeeData?.department_id) {
        const { data: departmentData, error: departmentError } = await supabaseAdmin
          .from('departments')
          .select('id, name')
          .eq('id', employeeData.department_id)
          .single();

        if (departmentError) throw departmentError;
        setDepartment(departmentData);
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
    }
  };

  // Fetch announcements
  const fetchAnnouncements = async () => {
    try {
      setLoading(true);

      let query = supabaseAdmin
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      console.log("Raw announcements data:", data);

      // Filter announcements based on audience and department
      if (data && department?.id) {
        const departmentId = department.id;
        console.log("Department ID:", departmentId);

        const filteredData = data.filter(announcement => {
          const isForAll = announcement.target_audience === 'all' || announcement.audience === 'All';
          const isForDepartment = announcement.target_department_id === departmentId;
          const isNotExpired = !announcement.expiry_date || new Date(announcement.expiry_date) >= new Date();

          console.log(`Announcement: ${announcement.title}, ForAll: ${isForAll}, ForDept: ${isForDepartment}, NotExpired: ${isNotExpired}`);

          return (isForAll || isForDepartment) && isNotExpired;
        });

        console.log("Filtered announcements:", filteredData);
        setAnnouncements(filteredData);
        setFilteredAnnouncements(filteredData);
      } else {
        // If no department or department not found, show only "All" announcements
        const filteredData = data?.filter(announcement => {
          const isForAll = announcement.target_audience === 'all' || announcement.audience === 'All';
          const isNotExpired = !announcement.expiry_date || new Date(announcement.expiry_date) >= new Date();
          return isForAll && isNotExpired;
        }) || [];

        console.log("Company-wide announcements:", filteredData);
        setAnnouncements(filteredData);
        setFilteredAnnouncements(filteredData);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
      setAnnouncements([]);
      setFilteredAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  // Extract UTC date from ISO string (fix for timezone issue)
  const extractUTCDate = (isoString: string): string => {
    if (!isoString) return '';

    try {
      // Parse the ISO string and extract UTC date parts
      const date = new Date(isoString);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error extracting UTC date:', error);
      return isoString.split('T')[0]; // Fallback to simple split
    }
  };

  // Extract UTC month from ISO string
  const extractUTCMonth = (isoString: string): number => {
    if (!isoString) return 0;

    try {
      const date = new Date(isoString);
      return date.getUTCMonth() + 1; // +1 because months are 0-indexed
    } catch (error) {
      console.error('Error extracting UTC month:', error);
      return new Date(isoString).getMonth() + 1; // Fallback
    }
  };

  // Extract UTC year from ISO string
  const extractUTCYear = (isoString: string): number => {
    if (!isoString) return 0;

    try {
      const date = new Date(isoString);
      return date.getUTCFullYear();
    } catch (error) {
      console.error('Error extracting UTC year:', error);
      return new Date(isoString).getFullYear(); // Fallback
    }
  };

  // Apply all filters including search
  useEffect(() => {
    if (!announcements.length) return;

    let filtered = [...announcements];
    console.log("Filtered Announcements ", filtered)

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(announcement =>
        announcement.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        announcement.message?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Date filter - FIXED: Use UTC date to avoid timezone issues
    if (selectedDate) {
      filtered = filtered.filter(announcement => {
        const announcementUTCDate = extractUTCDate(announcement.created_at);
        console.log("Announcement UTC Date:", announcementUTCDate, "Selected Date:", selectedDate);
        return announcementUTCDate === selectedDate;
      });
    }

    // Month filter - FIXED: Use UTC month
    if (selectedMonth) {
      filtered = filtered.filter(announcement => {
        const announcementUTCMonth = extractUTCMonth(announcement.created_at);
        return announcementUTCMonth.toString() === selectedMonth;
      });
    }

    // Year filter - FIXED: Use UTC year
    if (selectedYear) {
      filtered = filtered.filter(announcement => {
        const announcementUTCYear = extractUTCYear(announcement.created_at);
        return announcementUTCYear.toString() === selectedYear;
      });
    }

    setFilteredAnnouncements(filtered);
  }, [searchQuery, selectedDate, selectedMonth, selectedYear, announcements]);

  // Initial data fetch
  useEffect(() => {
    const initializeData = async () => {
      await fetchEmployeeData();
    };

    initializeData();
  }, [empId]);

  // Fetch announcements when department is set
  useEffect(() => {
    if (employee) {
      fetchAnnouncements();
    }
  }, [employee, department]);

  // Set up real-time subscription
  useEffect(() => {
    if (!employee) return;

    const channel = supabaseAdmin
      .channel('announcements-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        () => {
          fetchAnnouncements();
        }
      )
      .subscribe();

    return () => {
      supabaseAdmin.removeChannel(channel);
    };
  }, [employee]);

  // Format date for display (UTC date without timezone conversion)
  const formatDisplayDate = (isoString: string): string => {
    if (!isoString) return '';

    try {
      const utcDate = extractUTCDate(isoString);
      const [year, month, day] = utcDate.split('-');

      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting display date:', error);
      return 'Invalid Date';
    }
  };

  // Table columns - Updated with UTC date formatting
  const columns = [
    {
      key: 'title',
      label: 'Title',
      sortable: true,
      render: (value: string) => (
        <span className="font-medium text-white">{value}</span>
      )
    },
    {
      key: 'message',
      label: 'Message',
      sortable: true,
      render: (value: string) => (
        <span className="text-white/80 line-clamp-2">{value}</span>
      )
    },
    {
      key: 'department',
      label: 'Department',
      sortable: true,
      render: (value: any, row: Announcement) => {
        const isForAll = row.target_audience === 'all' || row.audience === 'All';
        return (
          <span className="text-white/70">
            {isForAll ? 'All' : (department?.name || 'Specific Department')}
          </span>
        );
      }
    },
    {
      key: 'created_by',
      label: 'Posted By',
      sortable: true,
      render: (value: string) => (
        <span className="text-white/70">{value || 'Admin'}</span>
      )
    },
    {
      key: 'created_at',
      label: 'Posted',
      sortable: true,
      render: (value: string) => {
        console.log("Original created_at:", value);
        const formattedDate = formatDisplayDate(value);
        console.log("Formatted date:", formattedDate);
        return (
          <span className="text-white/70">
            {formattedDate}
          </span>
        );
      }
    },
    {
      key: 'expiry_date',
      label: 'Expiry Date',
      sortable: true,
      render: (value: string) => {
        if (!value) return <span className="text-white/50">No expiry</span>;
        const formattedDate = formatDisplayDate(value);
        return (
          <span className="text-white/70">
            {formattedDate}
          </span>
        );
      }
    },
    {
      key: 'priority',
      label: 'Priority',
      sortable: true,
      render: (value: string) => {
        const getPriorityColor = (priority: string) => {
          switch (priority?.toLowerCase()) {
            case 'urgent':
              return 'bg-red-500/20 text-red-400';
            case 'high':
              return 'bg-orange-500/20 text-orange-400';
            case 'medium':
              return 'bg-yellow-500/20 text-yellow-400';
            case 'low':
              return 'bg-green-500/20 text-green-400';
            default:
              return 'bg-gray-500/20 text-gray-400';
          }
        };

        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(value)}`}>
            {value || 'Normal'}
          </span>
        );
      }
    },
    {
      key: 'type',
      label: 'TYPE',
      sortable: true,
      render: (value: string) => {
        const getTypeColor = (type: string) => {
          switch (type?.toLowerCase()) {
            case 'alert':
              return 'bg-red-500/20 text-red-400';
            case 'info':
              return 'bg-blue-500/20 text-blue-400';
            case 'warning':
              return 'bg-yellow-500/20 text-yellow-400';
            case 'success':
              return 'bg-green-500/20 text-green-400';
            default:
              return 'bg-gray-500/20 text-gray-400';
          }
        };

        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(value)}`}>
            {value || 'General'}
          </span>
        );
      }
    }
  ];

  return (
    <div className="min-h-screen bg-[#171717] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Section Header with integrated filters and clear button */}
        <SectionHeader
          title="Announcements"
          description="Stay updated with the latest company announcements and notifications"
          actions={
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              {/* Search Bar */}
              <div className="relative min-w-[250px]">
                <input
                  type="text"
                  placeholder="Search announcements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full p-2 pl-10 pr-4 rounded-lg bg-black border border-[#333333] text-white text-sm "
                  // focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white pointer-events-none">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                    />
                  </svg>
                </div>
              </div>

              {/* Date, Month, Year Filters and Clear Button in one row */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                {/* Date Filter */}
                <div className="flex flex-col">
                  <div className="relative">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full p-2 pl-9 pr-3 rounded-lg bg-black border border-[#333333] text-white text-sm [color-scheme:dark] cursor-pointer min-w-[140px]"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white pointer-events-none">
                      <CalendarIcon />
                    </div>
                  </div>
                </div>

                {/* Month Filter */}
                <div className="flex flex-col">
                  <FilterSelect
                    options={monthOptions}
                    value={selectedMonth}
                    onChange={setSelectedMonth}
                    placeholder="All Months"
                    icon={<CalendarIcon />}
                    className="min-w-[140px]"
                  />
                </div>

                {/* Year Filter */}
                <div className="flex flex-col">
                  <YearInput selectedYear={selectedYear} setSelectedYear={setSelectedYear} />
                </div>

                {/* Clear Filters Button */}
                {(selectedDate || selectedMonth || selectedYear || searchQuery) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedDate('');
                      setSelectedMonth('');
                      setSelectedYear('');
                      setSearchQuery('');
                    }}
                    className="h-[42px] border-[#333333] text-white hover:bg-[#333333] hover:text-white whitespace-nowrap"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          }
        />

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-white/60 text-sm">
            Showing {filteredAnnouncements.length} of {announcements.length} announcements
            {department?.name && ` • Filtered for ${department.name} department`}
            {!department?.name && employee && ` • Showing company-wide announcements only`}
            {searchQuery && ` • Searching for "${searchQuery}"`}
          </p>
        </div>

        {/* Announcements Table */}
        <DataTable
          columns={columns}
          data={filteredAnnouncements}
          loading={loading}
          emptyMessage="No announcements found. Try adjusting your filters or check back later for new announcements."
          onRowClick={(row) => {
            // You can implement a modal or detailed view here
            console.log('Clicked announcement:', row);
          }}
        />
      </div>
    </div>
  );
}