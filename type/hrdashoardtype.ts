// types/hrdashboard.ts
export interface Employee {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  joining_date: string;
  status: string;
  department_id: string;
  role_id: string;
  manager_id: string;
  manager_name?: string;
  departments?: {
    id: string;
    name: string;
  } | null;
  roles?: {
    id: string;
    role_name: string;
  } | null;
  managers?: {
    id: string;
    name: string;
  } | null;
}

export interface DashboardStats {
  totalEmployees: number;
  activeDepartments: number;
  newJoinings: number;
  pendingLeaves: number;
  openPositions: number;
  totalApplicants: number;
  interviewsScheduled: number;
  hiringSuccessRate: number;
}

export interface EmployeeGrowthData {
  date: string;
  employees: number;
}

export interface Department {
  id: string;
  name: string;
  status: string;
}

export interface TrendData {
  totalEmployeesTrend: number;
  activeDepartmentsTrend: number;
  newJoiningsTrend: number;
  pendingLeavesTrend: number;
  openPositionsTrend: number;
  totalApplicantsTrend: number;
  interviewsScheduledTrend: number;
  hiringSuccessRateTrend: number;
}

// Recruitment Types
export interface JobOpening {
  id: string;
  job_id: string;
  title: string;
  department_id: string;
  openings_count: number;
  description?: string;
  requirements?: string;
  experience_required?: string;
  salary_range?: string;
  status: string;
  posted_by: string;
  posted_at: string;
  closed_at?: string;
  created_at: string;
  departments?: {
    id: string;
    name: string;
  } | null;
  posted_by_employee?: {
    id: string;
    name: string;
  } | null;
}

export interface Applicant {
  id: string;
  applicant_id: string;
  name: string;
  email: string;
  phone?: string;
  applied_position: string;
  department_id: string;
  resume_url?: string;
  cover_letter?: string;
  status: string;
  applied_date: string;
  interviewer_id?: string;
  remarks?: string;
  created_at: string;
  departments?: {
    id: string;
    name: string;
  } | null;
  interviewer?: {
    id: string;
    name: string;
  } | null;
}

export interface CandidatePipeline {
  id: string;
  applicant_id: string;
  stage: string;
  stage_date: string;
  handled_by?: string;
  remarks?: string;
  next_step?: string;
  created_at: string;
  applicants?: {
    id: string;
    name: string;
    applied_position: string;
    email: string;
    departments?: {
      id: string;
      name: string;
    } | null;
  } | null;
  handled_by_employee?: {
    id: string;
    name: string;
  } | null;
}

export interface RecruitmentStats {
  totalOpenings: number;
  totalApplicants: number;
  interviewsThisWeek: number;
  hiringSuccessRate: number;
}