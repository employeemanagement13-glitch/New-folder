// hooks/useHRDashboard.ts
import { useState, useEffect } from 'react';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { 
  DashboardStats, 
  Employee, 
  EmployeeGrowthData, 
  JobOpening, 
  Applicant,
  CandidatePipeline,
  RecruitmentStats 
} from '@/type/hrdashoardtype';

export function useHRDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [jobOpenings, setJobOpenings] = useState<JobOpening[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [
        statsData,
        employeesData,
        jobOpeningsData,
        applicantsData
      ] = await Promise.all([
        fetchDashboardStats(),
        fetchRecentEmployees(),
        fetchJobOpenings(),
        fetchApplicants()
      ]);

      setStats(statsData);
      setEmployees(employeesData);
      setJobOpenings(jobOpeningsData);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async (): Promise<DashboardStats> => {
    // Total Employees
    const { count: totalEmployees, error: employeesError } = await supabaseAdmin
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    if (employeesError) throw employeesError;

    // Active Departments
    const { count: activeDepartments, error: deptError } = await supabaseAdmin
      .from('departments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    if (deptError) throw deptError;

    // New joinings this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: newJoinings, error: joiningsError } = await supabaseAdmin
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .gte('joining_date', startOfMonth.toISOString().split('T')[0]);

    if (joiningsError) throw joiningsError;

    // Pending leave requests
    const { count: pendingLeaves, error: leavesError } = await supabaseAdmin
      .from('leave_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (leavesError) throw leavesError;

    // Job openings
    const { count: openPositions, error: jobsError } = await supabaseAdmin
      .from('job_openings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');

    if (jobsError) throw jobsError;

    // Total applicants
    const { count: totalApplicants, error: applicantsError } = await supabaseAdmin
      .from('applicants')
      .select('*', { count: 'exact', head: true });

    if (applicantsError) throw applicantsError;

    return {
      totalEmployees: totalEmployees || 0,
      activeDepartments: activeDepartments || 0,
      newJoinings: newJoinings || 0,
      pendingLeaves: pendingLeaves || 0,
      openPositions: openPositions || 0,
      totalApplicants: totalApplicants || 0,
      interviewsScheduled: 0, // You'll need to calculate this
      hiringSuccessRate: 0, // You'll need to calculate this
      // Mock trend data - replace with actual calculations
      totalEmployeesTrend: 12,
      activeDepartmentsTrend: 5,
      newJoiningsTrend: 8,
      pendingLeavesTrend: -3,
      openPositionsTrend: 15,
      totalApplicantsTrend: 25,
      interviewsScheduledTrend: 10,
      hiringSuccessRateTrend: 5
    };
  };

  const fetchRecentEmployees = async (): Promise<Employee[]> => {
    const { data, error } = await supabaseAdmin
      .from('employees')
      .select(`
        *,
        departments (id, name),
        roles (id, role_name),
        managers:employees!employees_manager_id_fkey (id, name)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    // Transform the data to match our types
    return (data || []).map(emp => ({
      ...emp,
      department: emp.departments?.[0] || undefined,
      role: emp.roles?.[0] || undefined,
      manager: emp.managers?.[0] || undefined
    }));
  };

  const fetchJobOpenings = async (): Promise<JobOpening[]> => {
    const { data, error } = await supabaseAdmin
      .from('job_openings')
      .select(`
        *,
        departments (id, name),
        posted_by_employee:employees!job_openings_posted_by_fkey (id, name)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    return (data || []).map(job => ({
      ...job,
      department: job.departments?.[0] || undefined,
      posted_by_employee: job.posted_by_employee?.[0] || undefined
    }));
  };

  const fetchApplicants = async (): Promise<Applicant[]> => {
    const { data, error } = await supabaseAdmin
      .from('applicants')
      .select(`
        *,
        departments (id, name),
        interviewer:employees!applicants_interviewer_id_fkey (id, name)
      `)
      .order('applied_date', { ascending: false })
      .limit(10);

    if (error) throw error;

    return (data || []).map(applicant => ({
      ...applicant,
      department: applicant.departments?.[0] || undefined,
      interviewer: applicant.interviewer?.[0] || undefined
    }));
  };

  return {
    stats,
    employees,
    jobOpenings,
    loading,
    error,
    refetch: fetchDashboardData
  };
}