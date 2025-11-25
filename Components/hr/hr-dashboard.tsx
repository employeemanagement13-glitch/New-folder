// components/hr-dashboard.tsx
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../Card';
import { 
  DashboardStats, 
  Employee, 
  EmployeeGrowthData, 
  JobOpening, 
  Applicant,
  CandidatePipeline,
  RecruitmentStats 
} from '@/type/hrdashoardtype';

interface HRDashboardProps {
  stats: DashboardStats;
  employees: Employee[];
  growthData: EmployeeGrowthData[];
  jobOpenings: JobOpening[];
  applicants: Applicant[];
  candidatePipeline: CandidatePipeline[];
  recruitmentStats: RecruitmentStats;
}

export default function HRDashboard({
  stats,
  employees,
  growthData,
  jobOpenings,
  applicants,
  candidatePipeline,
  recruitmentStats
}: HRDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Employees"
          value={stats.totalEmployees}
        />
        <StatCard
          title="Active Departments"
          value={stats.activeDepartments}
        />
        <StatCard
          title="New Joinings"
          value={stats.newJoinings}
        />
        <StatCard
          title="Pending Leaves"
          value={stats.pendingLeaves}
        />
      </div> */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recruitment Stats */}
        <Card className="bg-[#111111] border-[#333333]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              📊 Recruitment Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-[#171717] rounded-lg">
                <div className="text-2xl font-bold text-white">{recruitmentStats.totalOpenings}</div>
                <div className="text-sm text-gray-400">Open Positions</div>
              </div>
              <div className="text-center p-4 bg-[#171717] rounded-lg">
                <div className="text-2xl font-bold text-white">{recruitmentStats.totalApplicants}</div>
                <div className="text-sm text-gray-400">Total Applicants</div>
              </div>
              <div className="text-center p-4 bg-[#171717] rounded-lg">
                <div className="text-2xl font-bold text-white">{recruitmentStats.interviewsThisWeek}</div>
                <div className="text-sm text-gray-400">Interviews This Week</div>
              </div>
              <div className="text-center p-4 bg-[#171717] rounded-lg">
                <div className="text-2xl font-bold text-white">{recruitmentStats.hiringSuccessRate}%</div>
                <div className="text-sm text-gray-400">Hiring Success Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-[#111111] border-[#333333]">
          <CardHeader>
            <CardTitle className="text-white">⚡ Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <button className="p-3 bg-[#ff9d00] text-black rounded-lg font-semibold hover:bg-[#e68a00] transition-colors">
                Add Employee
              </button>
              <button className="p-3 bg-[#333333] text-white rounded-lg font-semibold hover:bg-[#444444] transition-colors">
                Post Job Opening
              </button>
              <button className="p-3 bg-[#333333] text-white rounded-lg font-semibold hover:bg-[#444444] transition-colors">
                Process Payroll
              </button>
              <button className="p-3 bg-[#333333] text-white rounded-lg font-semibold hover:bg-[#444444] transition-colors">
                View Reports
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Employees Table */}
      <Card className="bg-[#111111] border-[#333333]">
        <CardHeader>
          <CardTitle className="text-white">👥 Recent Employees</CardTitle>
        </CardHeader>
        <CardContent>
          <EmployeesTable employees={employees.slice(0, 5)} />
        </CardContent>
      </Card>

      {/* Job Openings Table */}
      <Card className="bg-[#111111] border-[#333333]">
        <CardHeader>
          <CardTitle className="text-white">💼 Open Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <JobOpeningsTable jobOpenings={jobOpenings} />
        </CardContent>
      </Card>
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: number;
  trend: number;
  icon: string;
}

function StatCard({ title, value, trend, icon }: StatCardProps) {
  const isPositive = trend >= 0;
  
  return (
    <Card className="bg-[#111111] border-[#333333] hover:bg-[#1a1a1a] transition-colors">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-white mt-1">{value.toLocaleString()}</p>
            <div className={`flex items-center mt-2 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              <span className={`mr-1 ${isPositive ? '↑' : '↓'}`}>
                {isPositive ? '↑' : '↓'}
              </span>
              <span className="text-sm">{Math.abs(trend)}%</span>
            </div>
          </div>
          <div className="text-3xl">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// Employees Table Component
interface EmployeesTableProps {
  employees: Employee[];
}

function EmployeesTable({ employees }: EmployeesTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#333333]">
            <th className="text-left py-3 px-4 text-gray-400 font-medium">Employee</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium">Department</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium">Role</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium">Join Date</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => (
            <tr key={employee.id} className="border-b border-[#333333] hover:bg-[#1a1a1a]">
              <td className="py-3 px-4">
                <div>
                  <div className="font-medium text-white">{employee.name}</div>
                  <div className="text-sm text-gray-400">{employee.employee_id}</div>
                </div>
              </td>
              <td className="py-3 px-4 text-gray-300">
                {employee.departments?.[0]?.name || 'N/A'}
              </td>
              <td className="py-3 px-4 text-gray-300">
                {employee.roles?.[0]?.role_name || 'N/A'}
              </td>
              <td className="py-3 px-4">
                <StatusBadge status={employee.status as any} />
              </td>
              <td className="py-3 px-4 text-gray-300">
                {new Date(employee.joining_date).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Job Openings Table Component
interface JobOpeningsTableProps {
  jobOpenings: JobOpening[];
}

function JobOpeningsTable({ jobOpenings }: JobOpeningsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#333333]">
            <th className="text-left py-3 px-4 text-gray-400 font-medium">Job ID</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium">Title</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium">Department</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium">Openings</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium">Posted</th>
          </tr>
        </thead>
        <tbody>
          {jobOpenings.map((job) => (
            <tr key={job.id} className="border-b border-[#333333] hover:bg-[#1a1a1a]">
              <td className="py-3 px-4 font-mono text-gray-300">{job.job_id}</td>
              <td className="py-3 px-4">
                <div className="font-medium text-white">{job.title}</div>
                {job.experience_required && (
                  <div className="text-sm text-gray-400">{job.experience_required}</div>
                )}
              </td>
              <td className="py-3 px-4 text-gray-300">
                {job.department?.name || 'N/A'}
              </td>
              <td className="py-3 px-4 text-gray-300">{job.openings_count}</td>
              <td className="py-3 px-4">
                <StatusBadge status={job.status as any} />
              </td>
              <td className="py-3 px-4 text-gray-300">
                {new Date(job.posted_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Status Badge Component
interface StatusBadgeProps {
  status: StatusVariant;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig = {
    active: { color: 'bg-green-500/20 text-green-400', label: 'Active' },
    inactive: { color: 'bg-red-500/20 text-red-400', label: 'Inactive' },
    probation: { color: 'bg-yellow-500/20 text-yellow-400', label: 'Probation' },
    resigned: { color: 'bg-gray-500/20 text-gray-400', label: 'Resigned' },
    on_leave: { color: 'bg-blue-500/20 text-blue-400', label: 'On Leave' },
    open: { color: 'bg-green-500/20 text-green-400', label: 'Open' },
    closed: { color: 'bg-red-500/20 text-red-400', label: 'Closed' },
    on_hold: { color: 'bg-yellow-500/20 text-yellow-400', label: 'On Hold' },
    applied: { color: 'bg-blue-500/20 text-blue-400', label: 'Applied' },
    screening: { color: 'bg-purple-500/20 text-purple-400', label: 'Screening' },
    interview: { color: 'bg-orange-500/20 text-orange-400', label: 'Interview' },
    offer: { color: 'bg-green-500/20 text-green-400', label: 'Offer' },
    hired: { color: 'bg-green-600/20 text-green-500', label: 'Hired' },
    rejected: { color: 'bg-red-500/20 text-red-400', label: 'Rejected' },
    pending: { color: 'bg-yellow-500/20 text-yellow-400', label: 'Pending' },
    approved: { color: 'bg-green-500/20 text-green-400', label: 'Approved' },
    cancelled: { color: 'bg-red-500/20 text-red-400', label: 'Cancelled' },
  };

  const config = statusConfig[status] || statusConfig.inactive;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}
