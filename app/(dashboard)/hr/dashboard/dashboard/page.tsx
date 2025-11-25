// app/hr/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Search, Users, Calendar, Filter, Download, Eye, Plus } from 'lucide-react';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/Card';
import StatCard from '@/Components/StatCard';
import DataTable from '@/Components/DataTable';
import FilterSelect from '@/Components/FilterSelect';
import SectionHeader from '@/Components/SectionHeader';
import LineChart from '@/Components/charts/LineChart';
import EmployeeForm from '@/Components/Employee/EmployeeForm';
import {
  Employee,
  DashboardStats,
  EmployeeGrowthData,
  Department,
  TrendData,
  JobOpening,
  Applicant,
  CandidatePipeline,
  RecruitmentStats
} from '@/type/hrdashoardtype';

// Import employee data functions
import {
  createEmployee,
  fetchDepartments,
  fetchRoles
} from '@/lib/Admin/employee-data';

export default function HRDashboard() {
  // State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [jobOpenings, setJobOpenings] = useState<JobOpening[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [candidatePipeline, setCandidatePipeline] = useState<CandidatePipeline[]>([]);

  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    activeDepartments: 0,
    newJoinings: 0,
    pendingLeaves: 0,
    openPositions: 0,
    totalApplicants: 0,
    interviewsScheduled: 0,
    hiringSuccessRate: 0
  });

  const [recruitmentStats, setRecruitmentStats] = useState<RecruitmentStats>({
    totalOpenings: 0,
    totalApplicants: 0,
    interviewsThisWeek: 0,
    hiringSuccessRate: 0
  });

  // const [trends, setTrends] = useState<TrendData>({
  //   totalEmployeesTrend: 0,
  //   activeDepartmentsTrend: 0,
  //   newJoiningsTrend: 0,
  //   pendingLeavesTrend: 0,
  //   openPositionsTrend: 0,
  //   totalApplicantsTrend: 0,
  //   interviewsScheduledTrend: 0,
  //   hiringSuccessRateTrend: 0
  // });

  const [growthData, setGrowthData] = useState<EmployeeGrowthData[]>([]);
  const [loading, setLoading] = useState(true);

  // Employee Form State
  const [isEmployeeFormOpen, setIsEmployeeFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [allRoles, setAllRoles] = useState<{ id: string; role_name: string }[]>([]);

  // Filter states
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Date filters
  const [employeeDateFilter, setEmployeeDateFilter] = useState<{ start: string, end: string }>({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const [recruitmentDateFilter, setRecruitmentDateFilter] = useState<{ start: string, end: string }>({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const [applicantDateFilter, setApplicantDateFilter] = useState<{ start: string, end: string }>({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Recruitment filters
  const [jobSearch, setJobSearch] = useState('');
  const [jobDepartmentFilter, setJobDepartmentFilter] = useState('');
  const [jobStatusFilter, setJobStatusFilter] = useState('');

  // Applicants filters
  const [applicantSearch, setApplicantSearch] = useState('');
  const [applicantDepartmentFilter, setApplicantDepartmentFilter] = useState('');
  const [applicantStatusFilter, setApplicantStatusFilter] = useState('');

  // Pipeline filters
  const [pipelineSearch, setPipelineSearch] = useState('');
  const [pipelineDepartmentFilter, setPipelineDepartmentFilter] = useState('');
  const [pipelineStageFilter, setPipelineStageFilter] = useState('');

  const [chartFilter, setChartFilter] = useState('all');

  // Load initial data
  useEffect(() => {
    fetchDashboardData();
    loadFormData();
  }, [employeeDateFilter, recruitmentDateFilter, applicantDateFilter]);

  // Load form data (departments and roles)
  const loadFormData = async () => {
    try {
      const [departmentsData, rolesData] = await Promise.all([
        fetchDepartments(),
        fetchRoles()
      ]);
      setAllRoles(rolesData);
    } catch (error) {
      console.error('Error loading form data:', error);
    }
  };

  // ========== DATABASE QUERY FUNCTIONS ==========

  const fetchEmployees = async (): Promise<Employee[]> => {
    let query = supabaseAdmin
      .from('employees')
      .select(`
        *,
        departments!employees_department_id_fkey(id, name, manager_id),
        roles(id, role_name)
      `)
      .gte('joining_date', employeeDateFilter.start)
      .lte('joining_date', employeeDateFilter.end)
      .order('joining_date', { ascending: false });

    const { data: employeesData, error } = await query;

    if (error) {
      console.error('Error fetching employees:', error);
      return [];
    }

    // Fetch managers separately using department manager_id
    const managerIds = employeesData
      ?.map(emp => emp.departments?.manager_id)
      .filter(Boolean) || [];

    if (managerIds.length > 0) {
      const { data: managersData } = await supabaseAdmin
        .from('employees')
        .select('id, name')
        .in('id', managerIds);

      const managersMap = new Map(managersData?.map(m => [m.id, m.name]) || []);

      return (employeesData || []).map(emp => ({
        ...emp,
        manager_name: emp.departments?.manager_id ?
          managersMap.get(emp.departments.manager_id) || 'N/A' : 'N/A'
      }));
    }

    return employeesData || [];
  };

  const fetchDepartmentsData = async (): Promise<Department[]> => {
    const { data, error } = await supabaseAdmin
      .from('departments')
      .select('id, name, status')
      .eq('status', 'active')
      .order('name');

    if (error) {
      console.error('Error fetching departments:', error);
      return [];
    }

    return data || [];
  };

  const fetchPendingLeaves = async (): Promise<number> => {
    const { data, error } = await supabaseAdmin
      .from('leave_requests')
      .select('id')
      .eq('status', 'pending');

    if (error) {
      console.error('Error fetching pending leaves:', error);
      return 0;
    }
    return data?.length || 0;
  };

  const fetchJobOpenings = async (): Promise<JobOpening[]> => {
    let query = supabaseAdmin
      .from('job_openings')
      .select(`
        *,
        departments!job_openings_department_id_fkey(id, name)
      `)
      .gte('posted_at', recruitmentDateFilter.start + 'T00:00:00')
      .lte('posted_at', recruitmentDateFilter.end + 'T23:59:59')
      .order('posted_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching job openings:', error);
      return [];
    }

    // Fetch posted_by names separately
    const postedByIds = data?.map(job => job.posted_by).filter(Boolean) || [];
    if (postedByIds.length > 0) {
      const { data: postersData } = await supabaseAdmin
        .from('employees')
        .select('id, name')
        .in('id', postedByIds);

      const postersMap = new Map(postersData?.map(p => [p.id, p.name]) || []);

      return (data || []).map(job => ({
        ...job,
        posted_by_name: postersMap.get(job.posted_by) || 'N/A'
      }));
    }

    return data || [];
  };

  const fetchApplicants = async (): Promise<Applicant[]> => {
    let query = supabaseAdmin
      .from('applicants')
      .select(`
        *,
        departments!applicants_department_id_fkey(id, name)
      `)
      .gte('applied_date', applicantDateFilter.start + 'T00:00:00')
      .lte('applied_date', applicantDateFilter.end + 'T23:59:59')
      .order('applied_date', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching applicants:', error);
      return [];
    }

    return data || [];
  };

  const fetchCandidatePipeline = async (): Promise<CandidatePipeline[]> => {
    const { data, error } = await supabaseAdmin
      .from('candidate_pipeline')
      .select(`
        *,
        applicants!candidate_pipeline_applicant_id_fkey(
          id,
          name,
          email,
          departments!applicants_department_id_fkey(id, name)
        )
      `)
      .order('stage_date', { ascending: false });

    if (error) {
      console.error('Error fetching candidate pipeline:', error);
      return [];
    }

    return data || [];
  };

  const fetchEmployeeGrowth = async (period: string): Promise<EmployeeGrowthData[]> => {
    const { data: employeesData, error } = await supabaseAdmin
      .from('employees')
      .select('joining_date')
      .eq('status', 'active')
      .order('joining_date', { ascending: true });

    if (error || !employeesData) {
      console.error('Error fetching employee growth data:', error);
      return [];
    }

    // Calculate cumulative growth
    const dateCounts: { [date: string]: number } = {};

    employeesData.forEach(employee => {
      const date = employee.joining_date.split('T')[0];
      if (!dateCounts[date]) {
        dateCounts[date] = 0;
      }
      dateCounts[date]++;
    });

    let cumulativeCount = 0;
    const sortedDates = Object.keys(dateCounts).sort();
    const growthData: EmployeeGrowthData[] = [];

    sortedDates.forEach(date => {
      cumulativeCount += dateCounts[date];
      growthData.push({
        date: date,
        employees: cumulativeCount
      });
    });

    return growthData;
  };

  const fetchPreviousMonthStats = async (): Promise<DashboardStats> => {
    return {
      totalEmployees: Math.max(0, stats.totalEmployees - 10),
      activeDepartments: Math.max(0, stats.activeDepartments - 2),
      newJoinings: Math.max(0, stats.newJoinings - 5),
      pendingLeaves: Math.max(0, stats.pendingLeaves - 8),
      openPositions: Math.max(0, stats.openPositions - 3),
      totalApplicants: Math.max(0, stats.totalApplicants - 20),
      interviewsScheduled: Math.max(0, stats.interviewsScheduled - 5),
      hiringSuccessRate: Math.max(0, stats.hiringSuccessRate - 5)
    };
  };

  const calculateTrends = (current: DashboardStats, previous: DashboardStats): TrendData => {
    const calculateTrend = (currentVal: number, previousVal: number): number => {
      if (previousVal === 0) return currentVal > 0 ? 100 : 0;
      return ((currentVal - previousVal) / previousVal) * 100;
    };

    return {
      totalEmployeesTrend: parseFloat(calculateTrend(current.totalEmployees, previous.totalEmployees).toFixed(1)),
      activeDepartmentsTrend: parseFloat(calculateTrend(current.activeDepartments, previous.activeDepartments).toFixed(1)),
      newJoiningsTrend: parseFloat(calculateTrend(current.newJoinings, previous.newJoinings).toFixed(1)),
      pendingLeavesTrend: parseFloat(calculateTrend(current.pendingLeaves, previous.pendingLeaves).toFixed(1)),
      openPositionsTrend: parseFloat(calculateTrend(current.openPositions, previous.openPositions).toFixed(1)),
      totalApplicantsTrend: parseFloat(calculateTrend(current.totalApplicants, previous.totalApplicants).toFixed(1)),
      interviewsScheduledTrend: parseFloat(calculateTrend(current.interviewsScheduled, previous.interviewsScheduled).toFixed(1)),
      hiringSuccessRateTrend: parseFloat(calculateTrend(current.hiringSuccessRate, previous.hiringSuccessRate).toFixed(1))
    };
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [
        employeesData,
        departmentsData,
        pendingLeavesCount,
        jobOpeningsData,
        applicantsData,
        pipelineData,
        growthData
      ] = await Promise.all([
        fetchEmployees(),
        fetchDepartmentsData(),
        fetchPendingLeaves(),
        fetchJobOpenings(),
        fetchApplicants(),
        fetchCandidatePipeline(),
        fetchEmployeeGrowth('all')
      ]);

      setEmployees(employeesData);
      setDepartments(departmentsData);
      setJobOpenings(jobOpeningsData);
      setApplicants(applicantsData);
      setCandidatePipeline(pipelineData);
      setGrowthData(growthData);

      // Calculate current stats
      const currentStats: DashboardStats = {
        totalEmployees: employeesData.length,
        activeDepartments: departmentsData.length,
        newJoinings: employeesData.filter(emp => {
          const joiningDate = new Date(emp.joining_date);
          const lastWeek = new Date();
          lastWeek.setDate(lastWeek.getDate() - 7);
          return joiningDate >= lastWeek;
        }).length,
        pendingLeaves: pendingLeavesCount,
        openPositions: jobOpeningsData.filter(job => job.status === 'open').length,
        totalApplicants: applicantsData.length,
        interviewsScheduled: pipelineData.filter(pipe =>
          pipe.stage.includes('interview') &&
          new Date(pipe.stage_date) >= new Date(new Date().setDate(new Date().getDate() - 7))
        ).length,
        hiringSuccessRate: applicantsData.length > 0 ?
          Math.round((applicantsData.filter(app => app.status === 'hired').length / applicantsData.length) * 100) : 0
      };

      setStats(currentStats);

      // Calculate recruitment stats
      const currentRecruitmentStats: RecruitmentStats = {
        totalOpenings: jobOpeningsData.filter(job => job.status === 'open').length,
        totalApplicants: applicantsData.length,
        interviewsThisWeek: pipelineData.filter(pipe =>
          pipe.stage.includes('interview') &&
          new Date(pipe.stage_date) >= new Date(new Date().setDate(new Date().getDate() - 7))
        ).length,
        hiringSuccessRate: applicantsData.length > 0 ?
          Math.round((applicantsData.filter(app => app.status === 'hired').length / applicantsData.length) * 100) : 0
      };

      setRecruitmentStats(currentRecruitmentStats);

      // Calculate trends
      const previousMonthStats = await fetchPreviousMonthStats();
      const calculatedTrends = calculateTrends(currentStats, previousMonthStats);
      // setTrends(calculatedTrends);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ========== EMPLOYEE FORM HANDLERS ==========

  const handleOpenEmployeeForm = () => {
    setIsEmployeeFormOpen(true);
  };

  const handleCloseEmployeeForm = () => {
    setIsEmployeeFormOpen(false);
  };

  const handleCreateEmployee = async (employeeData: any) => {
    try {
      setFormLoading(true);
      console.log('Creating employee with data:', employeeData);

      const result = await createEmployee(employeeData);

      if (result.success) {
        console.log('Employee created successfully');
        // Refresh the dashboard data
        await fetchDashboardData();
        handleCloseEmployeeForm();
        // You might want to show a success toast here
      } else {
        console.error('Failed to create employee:', result.error);
        // You might want to show an error toast here
        alert(result.error || 'Failed to create employee');
      }
    } catch (error) {
      console.error('Error creating employee:', error);
      alert('An unexpected error occurred while creating the employee');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle chart filter change
  const handleChartFilterChange = async (value: string) => {
    setChartFilter(value);
    const newGrowthData = await fetchEmployeeGrowth(value);
    setGrowthData(newGrowthData);
  };

  // Date filter handlers
  const handleEmployeeDateFilter = (type: 'start' | 'end', value: string) => {
    setEmployeeDateFilter(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const handleRecruitmentDateFilter = (type: 'start' | 'end', value: string) => {
    setRecruitmentDateFilter(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const handleApplicantDateFilter = (type: 'start' | 'end', value: string) => {
    setApplicantDateFilter(prev => ({
      ...prev,
      [type]: value
    }));
  };

  // Reset date filters
  const resetEmployeeDateFilter = () => {
    setEmployeeDateFilter({
      start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    });
  };

  const resetRecruitmentDateFilter = () => {
    setRecruitmentDateFilter({
      start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    });
  };

  const resetApplicantDateFilter = () => {
    setApplicantDateFilter({
      start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    });
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearch('');
    setDepartmentFilter('');
    setStatusFilter('');
    setJobSearch('');
    setJobDepartmentFilter('');
    setJobStatusFilter('');
    setApplicantSearch('');
    setApplicantDepartmentFilter('');
    setApplicantStatusFilter('');
    setPipelineSearch('');
    setPipelineDepartmentFilter('');
    setPipelineStageFilter('');
    resetEmployeeDateFilter();
    resetRecruitmentDateFilter();
    resetApplicantDateFilter();
  };

  // ========== FILTER FUNCTIONS ==========

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = !search ||
      employee.name.toLowerCase().includes(search.toLowerCase()) ||
      employee.employee_id?.toLowerCase().includes(search.toLowerCase());

    const matchesDepartment = !departmentFilter ||
      employee.departments?.name === departmentFilter;

    const matchesStatus = !statusFilter || employee.status === statusFilter;

    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const filteredJobOpenings = jobOpenings.filter(job => {
    const matchesSearch = !jobSearch ||
      job.title.toLowerCase().includes(jobSearch.toLowerCase()) ||
      job.job_id.toLowerCase().includes(jobSearch.toLowerCase());

    const matchesDepartment = !jobDepartmentFilter ||
      job.departments?.name === jobDepartmentFilter;

    const matchesStatus = !jobStatusFilter || job.status === jobStatusFilter;

    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const filteredApplicants = applicants.filter(applicant => {
    const matchesSearch = !applicantSearch ||
      applicant.name.toLowerCase().includes(applicantSearch.toLowerCase()) ||
      applicant.applicant_id?.toLowerCase().includes(applicantSearch.toLowerCase()) ||
      applicant.applied_position?.toLowerCase().includes(applicantSearch.toLowerCase());

    const matchesDepartment = !applicantDepartmentFilter ||
      applicant.departments?.name === applicantDepartmentFilter;

    const matchesStatus = !applicantStatusFilter || applicant.status === applicantStatusFilter;

    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const filteredPipeline = candidatePipeline.filter(pipeline => {
    const matchesSearch = !pipelineSearch ||
      pipeline.applicants?.name.toLowerCase().includes(pipelineSearch.toLowerCase()) ||
      pipeline.applicants?.email.toLowerCase().includes(pipelineSearch.toLowerCase());

    const matchesDepartment = !pipelineDepartmentFilter ||
      pipeline.applicants?.departments?.name === pipelineDepartmentFilter;

    const matchesStage = !pipelineStageFilter || pipeline.stage === pipelineStageFilter;

    return matchesSearch && matchesDepartment && matchesStage;
  });

  // ========== TABLE COLUMNS ==========

  const employeeColumns = [
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
      label: 'Emp ID',
      sortable: true,
      render: (value: string) => (
        <span className="font-mono text-sm text-gray-300">{value}</span>
      )
    },
    {
      key: 'department',
      label: 'Department',
      render: (value: any, row: Employee) => (
        <span className="text-gray-300">{row.departments?.name || 'N/A'}</span>
      )
    },
    {
      key: 'role',
      label: 'Role',
      render: (value: any, row: Employee) => (
        <span className="text-gray-300">{row.roles?.role_name || 'N/A'}</span>
      )
    },
    {
      key: 'joining_date',
      label: 'Join Date',
      render: (value: string) => (
        <span className="whitespace-nowrap text-gray-300">
          {new Date(value).toLocaleDateString('en-GB')}
        </span>
      )
    },
    {
      key: 'manager',
      label: 'Manager',
      render: (value: any, row: Employee) => (
        <span className="text-gray-300">{row?.manager_name || 'N/A'}</span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${value === 'active' ? 'bg-green-500/20 text-green-400' :
            value === 'inactive' ? 'bg-gray-500/20 text-gray-400' :
              value === 'probation' ? 'bg-yellow-500/20 text-yellow-400' :
                value === 'resigned' ? 'bg-red-500/20 text-red-400' :
                  'bg-blue-500/20 text-blue-400'
          }`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value: any, row: Employee) => (
        <Link
          href={`/hr/employees/${row.id}`}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-[#ff9d00] hover:text-[#e68e00] text-sm font-medium rounded-md transition-colors"
        >
          {/* <Eye size={14} /> */}
          View
        </Link>
      )
    }
  ];

  // Extract unique values for filters
  const departmentOptions = [
    { value: '', label: 'All Departments' },
    ...departments.map(dept => ({ value: dept.name, label: dept.name }))
  ];

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'probation', label: 'Probation' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#171717] flex items-center justify-center">
        <div className="text-white text-xl">Loading HR Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#171717] text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-full mx-auto">
        {/* Header Section */}
        <SectionHeader
          title="HR Dashboard"
          description="Welcome to your HR management dashboard"
          actions={
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              {/* Search Input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full sm:w-64 p-2 pl-10 rounded-lg bg-black border border-[#333333] text-white text-sm focus:ring-2"
                />
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>

              {/* Clear Filters */}
              {(search || departmentFilter || statusFilter || jobSearch || applicantSearch || pipelineSearch) && (
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2 bg-transparent hover:bg-[#1a1a1a] text-white border border-[#333333] rounded-lg text-sm font-medium transition-colors"
                >
                  Clear Filters
                </button>
              )}

              {/* Add Employee Button */}
              <button
                onClick={handleOpenEmployeeForm}
                className="flex items-center gap-2 px-4 py-2 bg-[#ff9d00] hover:bg-[#e68e00] text-black rounded-lg text-sm font-medium transition-colors"
              >
                <Plus size={16} />
                Add Employee
              </button>
            </div>
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Employee"
            value={stats.totalEmployees}
            // trend={trends.totalEmployeesTrend}
          />
          <StatCard
            title="Act Departments"
            value={stats.activeDepartments}
            // trend={trends.activeDepartmentsTrend}
          />
          <StatCard
            title="New Joinings"
            value={stats.newJoinings}
            // trend={trends.newJoiningsTrend}
          />
          <StatCard
            title="Pending leaves"
            value={stats.pendingLeaves}
            // trend={trends.pendingLeavesTrend}
          />
        </div>

        {/* Recent Joinings Table */}
        <div className="mb-8">
          <SectionHeader
            title="Recent Joinings"
            description={`${filteredEmployees.length} employees from the last week`}
            actions={
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                {/* Department Filter */}
                <FilterSelect
                  options={departmentOptions}
                  value={departmentFilter}
                  onChange={setDepartmentFilter}
                  icon={<Users size={16} />}
                  placeholder="All Departments"
                />

                {/* Status Filter */}
                <FilterSelect
                  options={statusOptions}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  icon={<Filter size={16} />}
                  placeholder="All Status"
                />

                {/* Date Filter for Employees */}
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={employeeDateFilter.start}
                    onChange={(e) => handleEmployeeDateFilter('start', e.target.value)}
                    className="bg-black border border-[#333333] rounded-lg px-3 py-2 text-white text-sm w-32  [color-scheme:dark]"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="date"
                    value={employeeDateFilter.end}
                    onChange={(e) => handleEmployeeDateFilter('end', e.target.value)}
                    className="bg-black border border-[#333333] rounded-lg px-3 py-2 text-white text-sm w-32 [color-scheme:dark]"
                  />
                  <button
                    onClick={resetEmployeeDateFilter}
                    className="px-3 py-2 bg-[#ff9d00] text-black rounded-lg text-sm font-medium hover:bg-[#ffb133] transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>
            }
          />
          <DataTable
            columns={employeeColumns}
            data={filteredEmployees}
            emptyMessage="No recent joinings found."
            onRowClick={(row) => console.log('Employee clicked:', row)}
          />
        </div>

        {/* Employee Growth Chart */}
        <div className="mb-8">
          <SectionHeader
            title="Employee Growth"
            description="Employee count growth over time"
            actions={
              <FilterSelect
                options={[
                  { value: 'all', label: 'All' },
                  { value: '6months', label: '6 Months' },
                  { value: 'year', label: '1 Year' }
                ]}
                value={chartFilter}
                onChange={handleChartFilterChange}
                placeholder="All"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                  </svg>
                }
              />
            }
          />
          <Card className="bg-[#111111] border-[#333333]">
            <CardContent className="p-6">
              {growthData.length > 0 ? (
                <LineChart
                  data={growthData}
                  dataKey="employees"
                  xAxisKey="date"
                  // fillColor="#ff9d00"
                  height={300}
                />
              ) : (
                <div className="flex items-center justify-center h-80 text-gray-400">
                  No growth data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Employee Form Modal */}
        <EmployeeForm
          isOpen={isEmployeeFormOpen}
          onClose={handleCloseEmployeeForm}
          onSubmit={handleCreateEmployee}
          departments={departments.map(dept => ({
            id: dept.id,
            name: dept.name,
            has_manager: false // This will be handled by the form's internal logic
          }))}
          roles={allRoles}
          managers={[]} // Pass empty array for now, as managers are handled differently
          loading={formLoading}
        />
      </div>
    </div>
  );
}