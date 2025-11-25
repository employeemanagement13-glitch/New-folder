// lib/dashboard-data.ts
import { supabaseAdmin } from "../supabaseAdmin";

// Interface matching our actual schema
export interface DashboardStats {
  totalEmployees: number;
  totalDepartments: number;
  attendancePercentage: number;
  ongoingLeaves: number;
}

export interface EmployeeGrowthData {
  month: string;
  year: string;
  new_hires: number;
  exits: number;
  total_employees: number;
  month_year: string;
}

export interface DepartmentPerformanceData {
  department_name: string;
  manager_name: string;
  new_hires: number;
  avg_rating: number;
  avg_attendance: number;
  total_employees: number;
  performance_month: string;
}

export interface DepartmentComparisonData {
  department_name: string;
  total_employees: number;
  attendance_rate: number;
  monthly_hires: number;
  active_leaves: number;
}

// Fetch dashboard stats from actual tables
export async function fetchDashboardStats(): Promise<DashboardStats> {
  const [
    { count: totalEmployees },
    { count: totalDepartments },
    { data: attendanceData },
    { data: leaveData }
  ] = await Promise.all([
    supabaseAdmin.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from('departments').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from('attendance').select('*').gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    supabaseAdmin.from('leave_requests').select('*').eq('status', 'approved')
  ]);

  const today = new Date().toISOString().split('T')[0];
  const presentCount = attendanceData?.filter(a => a.status === 'present').length || 0;
  const totalAttendanceRecords = attendanceData?.length || 0;
  const attendancePercentage = totalAttendanceRecords > 0 ? 
    Math.round((presentCount / totalAttendanceRecords) * 100) : 0;

  const ongoingLeaves = leaveData?.filter(leave => 
    leave.start_date <= today && leave.end_date >= today
  ).length || 0;

  return {
    totalEmployees: totalEmployees || 0,
    totalDepartments: totalDepartments || 0,
    attendancePercentage,
    ongoingLeaves
  };
}

// Generate employee growth analytics from actual data
export async function fetchEmployeeGrowthAnalytics(): Promise<EmployeeGrowthData[]> {
  const { data: employees } = await supabaseAdmin
    .from('employees')
    .select('id, joining_date, status, created_at')
    .order('joining_date');

  if (!employees) return [];

  // Group by month and calculate analytics
  const monthlyData: { [key: string]: EmployeeGrowthData } = {};

  employees.forEach(employee => {
    const joinDate = new Date(employee.joining_date);
    const monthYear = `${joinDate.getFullYear()}-${String(joinDate.getMonth() + 1).padStart(2, '0')}`;
    const monthName = joinDate.toLocaleString('default', { month: 'long' });
    
    if (!monthlyData[monthYear]) {
      monthlyData[monthYear] = {
        month: monthName,
        year: joinDate.getFullYear().toString(),
        new_hires: 0,
        exits: 0,
        total_employees: 0,
        month_year: monthYear
      };
    }

    // Count new hires
    monthlyData[monthYear].new_hires++;

    // Count exits (if status is resigned/inactive)
    if (employee.status === 'resigned') {
      monthlyData[monthYear].exits++;
    }
  });

  // Calculate cumulative total employees
  let cumulativeTotal = 0;
  return Object.values(monthlyData)
    .sort((a, b) => a.month_year.localeCompare(b.month_year))
    .map(month => {
      cumulativeTotal += month.new_hires - month.exits;
      return {
        ...month,
        total_employees: Math.max(0, cumulativeTotal)
      };
    });
}

// Generate department performance data
export async function fetchDepartmentPerformance(): Promise<DepartmentPerformanceData[]> {
  const [
    { data: departments },
    { data: employees },
    { data: attendance },
    { data: performanceReviews }
  ] = await Promise.all([
    supabaseAdmin.from('departments').select('*'),
    supabaseAdmin.from('employees').select('*'),
    supabaseAdmin.from('attendance').select('*'),
    supabaseAdmin.from('performance_reviews').select('*')
  ]);

  if (!departments || !employees) return [];

  return departments.map(dept => {
    const deptEmployees = employees.filter(emp => emp.department_id === dept.id);
    const manager = deptEmployees.find(emp => emp.id === dept.manager_id);
    
    // Calculate department attendance
    const deptAttendance = attendance?.filter(a => 
      deptEmployees.some(emp => emp.id === a.employee_id)
    ) || [];
    const presentCount = deptAttendance.filter(a => a.status === 'present').length;
    const avgAttendance = deptAttendance.length > 0 ? (presentCount / deptAttendance.length) * 100 : 0;

    // Calculate average rating
    const deptReviews = performanceReviews?.filter(review => 
      deptEmployees.some(emp => emp.id === review.employee_id)
    ) || [];
    const avgRating = deptReviews.length > 0 ? 
      deptReviews.reduce((sum, review) => sum + review.overall_rating, 0) / deptReviews.length : 0;

    return {
      department_name: dept.name,
      manager_name: manager?.name || 'Not Assigned',
      new_hires: deptEmployees.filter(emp => {
        const joinDate = new Date(emp.joining_date);
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return joinDate > monthAgo;
      }).length,
      avg_rating: avgRating,
      avg_attendance: avgAttendance,
      total_employees: deptEmployees.length,
      performance_month: new Date().toISOString().split('T')[0]
    };
  });
}

// Generate department comparison data
export async function fetchDepartmentComparison(): Promise<DepartmentComparisonData[]> {
  const { data: departments } = await supabaseAdmin.from('departments').select('*');
  const { data: employees } = await supabaseAdmin.from('employees').select('*');
  const { data: attendance } = await supabaseAdmin.from('attendance').select('*');
  const { data: leaveRequests } = await supabaseAdmin.from('leave_requests').select('*');

  if (!departments || !employees) return [];

  return departments.map(dept => {
    const deptEmployees = employees.filter(emp => emp.department_id === dept.id);
    const deptAttendance = attendance?.filter(a => 
      deptEmployees.some(emp => emp.id === a.employee_id)
    ) || [];
    const presentCount = deptAttendance.filter(a => a.status === 'present').length;
    const attendanceRate = deptAttendance.length > 0 ? (presentCount / deptAttendance.length) * 100 : 0;

    const monthlyHires = deptEmployees.filter(emp => {
      const joinDate = new Date(emp.joining_date);
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return joinDate > monthAgo;
    }).length;

    const activeLeaves = leaveRequests?.filter(leave => 
      leave.status === 'approved' &&
      deptEmployees.some(emp => emp.id === leave.employee_id) &&
      new Date(leave.start_date) <= new Date() &&
      new Date(leave.end_date) >= new Date()
    ).length || 0;

    return {
      department_name: dept.name,
      total_employees: deptEmployees.length,
      attendance_rate: attendanceRate,
      monthly_hires: monthlyHires,
      active_leaves: activeLeaves
    };
  });
}