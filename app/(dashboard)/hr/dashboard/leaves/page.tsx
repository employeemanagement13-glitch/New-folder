'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Search, Filter, Download, RefreshCw } from 'lucide-react';
import DataTable from '@/Components/DataTable';
import FilterSelect from '@/Components/FilterSelect';
import SectionHeader from '@/Components/SectionHeader';
import { getLeaveRecords, getLeaveReports, updateLeaveStatus, getDepartments, getLeaveTypes } from './actions/leaves';
import { LeaveRecord, LeaveReport, LeaveFilters, ReportFilters } from '@/type/hrleaves';
import StatCard from '@/Components/StatCard';

interface Department {
  id: string;
  name: string;
}

interface LeaveType {
  id: string;
  name: string;
}

export default function HRLeavesPage() {
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([]);
  const [leaveReports, setLeaveReports] = useState<LeaveReport[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filters for leaves management
  const [leaveFilters, setLeaveFilters] = useState<LeaveFilters>({
    department: '',
    date: '',
    status: '',
    employee_search: ''
  });

  // Filters for leave reports
  const [reportFilters, setReportFilters] = useState<ReportFilters>({
    search: '',
    month_year: format(new Date(), 'yyyy-MM'),
    department: ''
  });

  // Load initial data on component mount
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load data when filters change
  useEffect(() => {
    loadData();
  }, [leaveFilters, reportFilters]);

  async function loadInitialData() {
    try {
      console.log('Loading initial data...');
      const [depts, types] = await Promise.all([
        getDepartments(),
        getLeaveTypes()
      ]);
      // console.log('Departments:', depts);
      // console.log('Leave types:', types);
      setDepartments(depts);
      setLeaveTypes(types);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  }

  async function loadData() {
    setRefreshing(true);
    try {
      // console.log('Loading leave data with filters:', { leaveFilters, reportFilters });
      const [records, reports] = await Promise.all([
        getLeaveRecords(leaveFilters),
        getLeaveReports(reportFilters)
      ]);
      
      // console.log('Loaded records:', records);
      // console.log('Loaded reports:', reports);
      const filteredRecords = records.filter(
        (record) => record.department !== "No Department"
      );
      setLeaveRecords(filteredRecords);
      setLeaveReports(reports);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const handleLeaveFilterChange = (key: keyof LeaveFilters, value: string) => {
    setLeaveFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleReportFilterChange = (key: keyof ReportFilters, value: string) => {
    setReportFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleStatusUpdate = async (leaveId: string, status: 'approved' | 'rejected') => {
    try {
      // console.log(`Updating leave ${leaveId} to ${status}`);
      await updateLeaveStatus(leaveId, status);
      await loadData(); // Refresh data
    } catch (error) {
      console.error('Error updating leave status:', error);
      alert('Failed to update leave status. Please try again.');
    }
  };

  // Clear leave filters
  const clearLeaveFilters = () => {
    setLeaveFilters({
      department: '',
      date: '',
      status: '',
      employee_search: ''
    });
  };

  // Clear report filters
  const clearReportFilters = () => {
    setReportFilters({
      search: '',
      month_year: format(new Date(), 'yyyy-MM'),
      department: ''
    });
  };

  // Check if any leave filters are active
  const hasActiveLeaveFilters = 
    leaveFilters.employee_search || 
    leaveFilters.department || 
    leaveFilters.status || 
    leaveFilters.date;

  // Check if any report filters are active
  const hasActiveReportFilters = 
    reportFilters.search ||
    reportFilters.department;

  // Generate CSV report
  const generateCSVReport = () => {
    if (leaveReports.length === 0) {
      alert('No data available to export.');
      return;
    }

    // CSV headers
    const headers = ['Department', 'Month', 'Total Leaves', 'Pending', 'Approved', 'Rejected'];
    
    // CSV rows
    const csvRows = leaveReports.map(report => [
      report.department,
      report.month,
      report.total_leaves.toString(),
      report.pending.toString(),
      report.approved.toString(),
      report.rejected.toString()
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `leave-reports-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate month options for the last 6 months
  const generateMonthOptions = () => {
    const options = [];
    const current = new Date();
    
    for (let i = 0; i < 6; i++) {
      const date = new Date(current.getFullYear(), current.getMonth() - i, 1);
      const value = format(date, 'yyyy-MM');
      const label = format(date, 'MMMM yyyy');
      options.unshift({ value, label });
    }
    
    return options;
  };

  // Filter options
  const departmentOptions = [
    { value: '', label: 'All Departments' },
    ...departments.map(dept => ({
      value: dept.name,
      label: dept.name
    }))
  ];

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' }
  ];

  const monthOptions = [
    { value: '', label: 'All Months' },
    ...generateMonthOptions()
  ];

  // Columns for Leaves Management Table
  const leaveColumns = [
    {
      key: 'employee_id',
      label: 'Emp ID',
      sortable: true
    },
    {
      key: 'employee_name',
      label: 'Emp Name',
      sortable: true
    },
    {
      key: 'department',
      label: 'Department',
      sortable: true
    },
    {
      key: 'leave_type',
      label: 'Leave Type',
      sortable: true,
      render: (value: string) => (
        <span className="capitalize">{value}</span>
      )
    },
    {
      key: 'start_date',
      label: 'From Date',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString('en-GB')
    },
    {
      key: 'end_date',
      label: 'To Date',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString('en-GB')
    },
    {
      key: 'total_days',
      label: 'Total Days',
      sortable: true,
      render: (value: number) => (
        <span className="font-semibold">{value} day{value !== 1 ? 's' : ''}</span>
      )
    },
    {
      key: 'applied_date',
      label: 'Applied On',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString('en-GB')
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string, row: LeaveRecord) => {
        const statusConfig = {
          pending: { color: 'bg-yellow-500', text: 'Pending' },
          approved: { color: 'bg-green-500', text: 'Approved' },
          rejected: { color: 'bg-red-500', text: 'Rejected' }
        };

        const config = statusConfig[value as keyof typeof statusConfig] || statusConfig.pending;
        
        return (
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.color} text-white`}>
            {config.text}
          </span>
        );
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value: any, row: LeaveRecord) => (
        <div className="flex space-x-2">
          {row.status === 'pending' && (
            <>
              <button
                onClick={() => handleStatusUpdate(row.id, 'approved')}
                className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Approve
              </button>
              <button
                onClick={() => handleStatusUpdate(row.id, 'rejected')}
                className="px-3 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Reject
              </button>
            </>
          )}
          {(row.status === 'approved' || row.status === 'rejected') && (
            <span className="text-gray-400 text-xs italic">Action Completed</span>
          )}
        </div>
      )
    }
  ];

  // Columns for Leave Reports Table
  const reportColumns = [
    {
      key: 'department',
      label: 'Department',
      sortable: true
    },
    {
      key: 'month',
      label: 'Month',
      sortable: true
    },
    {
      key: 'total_leaves',
      label: 'Total Leaves',
      sortable: true,
      render: (value: number) => (
        <span className="font-bold text-white">{value}</span>
      )
    },
    {
      key: 'pending',
      label: 'Pending',
      sortable: true,
      render: (value: number) => (
        <span className="text-yellow-400 font-semibold">{value}</span>
      )
    },
    {
      key: 'approved',
      label: 'Approved',
      sortable: true,
      render: (value: number) => (
        <span className="text-green-400 font-semibold">{value}</span>
      )
    },
    {
      key: 'rejected',
      label: 'Rejected',
      sortable: true,
      render: (value: number) => (
        <span className="text-red-400 font-semibold">{value}</span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value: any, row: LeaveReport) => (
        <div className="flex space-x-2">
          <button 
            className="px-3 py-1 bg-[#ff9d00] text-black text-xs rounded-lg hover:bg-[#e68a00] transition-colors font-medium"
            onClick={() => {
              // Export single department report as CSV
              const csvContent = [
                ['Department', 'Month', 'Total Leaves', 'Pending', 'Approved', 'Rejected'],
                [row.department, row.month, row.total_leaves.toString(), row.pending.toString(), row.approved.toString(), row.rejected.toString()]
              ].map(row => row.join(',')).join('\n');
              
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              const url = URL.createObjectURL(blob);
              link.setAttribute('href', url);
              link.setAttribute('download', `leave-report-${row.department}-${row.month}.csv`);
              link.style.visibility = 'hidden';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            Export CSV
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-[#171717] text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-full mx-auto">
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard 
            title="Pending Leaves" 
            value={leaveRecords.filter(r => r.status === 'pending').length} 
          />
          <StatCard 
            title="Approved Leaves" 
            value={leaveRecords.filter(r => r.status === 'approved').length} 
          />
          <StatCard 
            title="Rejected Leaves" 
            value={leaveRecords.filter(r => r.status === 'rejected').length} 
          />
        </div>

        {/* Leave Requests Management Section */}
        <div className="mb-8">
          <SectionHeader
            title="Leave Requests Management"
            description="Review and manage all employee leave applications"
            actions={
              <div className="flex flex-col justify-center items-center sm:flex-row gap-3 w-full sm:w-auto">
                {/* Search Input for Employees (ID and Name) */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by Name..."
                    value={leaveFilters.employee_search}
                    onChange={(e) => handleLeaveFilterChange('employee_search', e.target.value)}
                    className="w-full sm:w-64 p-2 pl-10 rounded-lg bg-black border border-[#333333] text-white text-sm focus:ring-2 focus:ring-[#ff9d00] focus:border-[#ff9d00] transition-colors"
                  />
                  <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>

                {/* Department Filter */}
                <FilterSelect
                  options={departmentOptions}
                  value={leaveFilters.department}
                  onChange={(value) => handleLeaveFilterChange('department', value)}
                  icon={<Filter size={16} />}
                  placeholder="All Departments"
                />

                {/* Status Filter */}
                <FilterSelect
                  options={statusOptions}
                  value={leaveFilters.status}
                  onChange={(value) => handleLeaveFilterChange('status', value)}
                  icon={<Filter size={16} />}
                  placeholder="All Status"
                />

                {/* Date Filter */}
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={leaveFilters.date}
                    onChange={(e) => handleLeaveFilterChange('date', e.target.value)}
                    className="bg-black border border-[#333333] rounded-lg px-3 py-2 text-white text-sm w-32 [color-scheme:dark] focus:ring-2 focus:ring-[#ff9d00] focus:border-[#ff9d00] transition-colors"
                  />
                </div>

                {/* Clear Filters Button */}
                {hasActiveLeaveFilters && (
                  <button
                    onClick={clearLeaveFilters}
                    className="px-4 py-2 bg-transparent hover:bg-[#1a1a1a] text-white border border-[#333333] rounded-lg text-sm font-medium transition-colors"
                  >
                    Clear Filters
                  </button>
                )}

                {/* Refresh Button */}
                <button
                  onClick={loadData}
                  disabled={refreshing}
                  className="flex items-center gap-2 px-4 py-2 bg-[#ff9d00] hover:bg-[#e68e00] text-black rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            }
          />

          {/* Leave Requests Table */}
          <div className="bg-[#111111] rounded-xl border border-[#333333] overflow-hidden">
            <DataTable
              columns={leaveColumns}
              data={leaveRecords}
              loading={loading && leaveRecords.length === 0}
              emptyMessage="No leave requests found for the selected filters."
              className="min-h-fit"
            />
          </div>
        </div>

        {/* Leave Analytics & Reports Section */}
        <div>
          <SectionHeader
            title="Leave Analytics & Reports"
            description="Comprehensive department-wise leave analysis and reporting"
            actions={
              <div className="flex flex-col justify-center items-center sm:flex-row gap-3 w-full sm:w-auto">
                {/* Search Department */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search departments..."
                    value={reportFilters.search}
                    onChange={(e) => handleReportFilterChange('search', e.target.value)}
                    className="w-full sm:w-64 p-2 pl-10 rounded-lg bg-black border border-[#333333] text-white text-sm focus:ring-2 focus:ring-[#ff9d00] focus:border-[#ff9d00] transition-colors"
                  />
                  <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>

                {/* Month/Year Filter */}
                <FilterSelect
                  options={monthOptions}
                  value={reportFilters.month_year}
                  onChange={(value) => handleReportFilterChange('month_year', value)}
                  placeholder="Select Month"
                />

                {/* Department Filter */}
                <FilterSelect
                  options={departmentOptions}
                  value={reportFilters.department}
                  onChange={(value) => handleReportFilterChange('department', value)}
                  placeholder="All Departments"
                />

                {/* Clear Filters Button */}
                {hasActiveReportFilters && (
                  <button
                    onClick={clearReportFilters}
                    className="px-4 py-2 bg-transparent hover:bg-[#1a1a1a] text-white border border-[#333333] rounded-lg text-sm font-medium transition-colors"
                  >
                    Clear Filters
                  </button>
                )}

                {/* Export Button */}
                <button
                  onClick={generateCSVReport}
                  disabled={leaveReports.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Download size={16} />
                  Export
                </button>
              </div>
            }
          />

          {/* Leave Reports Table */}
          <div className="bg-[#111111] rounded-xl border border-[#333333] overflow-hidden">
            <DataTable
              columns={reportColumns}
              data={leaveReports}
              loading={loading && leaveReports.length === 0}
              emptyMessage="No leave reports available for the selected period and filters."
              className=""
            />
          </div>
        </div>
      </div>
    </div>
  );
}