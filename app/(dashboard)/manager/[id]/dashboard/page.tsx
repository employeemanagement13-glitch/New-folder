import { Suspense } from 'react';
import ManagerDashboardClient from '@/Components/manager/manager-dashboard-client';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

interface PageProps {
  params: {
    id: string;
  };
}

async function getManagerData(managerId: string) {
  // First, check if this employee is actually a manager
  const { data: managerData, error: managerError } = await supabaseAdmin
    .from('employees')
    .select('*')
    .eq('id', managerId)
    .single();

  if (managerError || !managerData) {
    console.error('Error fetching manager data:', managerError);
    return null;
  }

  // Check if this employee manages any department
  const { data: departmentData, error: deptError } = await supabaseAdmin
    .from('departments')
    .select('id, name, manager_id')
    .eq('manager_id', managerId)
    .single();

  if (deptError || !departmentData) {
    console.error('Employee is not a manager or department not found');
    return null;
  }

  return {
    id: managerData.id,
    name: managerData.name,
    department_id: departmentData.id,
    department_name: departmentData.name
  };
}

export default async function ManagerDashboardPage({ params }: PageProps) {
    const id = await params;

  console.log('ID is', id.id);
  
  const managerData = await getManagerData(id.id);

  if (!managerData) {
    return (
      <div className="min-h-screen bg-[#171717] flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-xl font-bold mb-2">Access Denied</div>
          <div className="text-gray-400">You are not authorized to view this dashboard</div>
          <div className="text-gray-400 text-sm mt-2">Only department managers can access this page</div>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#171717] flex items-center justify-center">
        <div className="text-white">Loading dashboard...</div>
      </div>
    }>
      <ManagerDashboardClient 
        managerId={id.id}
        managerData={managerData}
      />
    </Suspense>
  );
}