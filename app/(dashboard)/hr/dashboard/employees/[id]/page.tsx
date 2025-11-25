import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { notFound } from 'next/navigation';
// import EmployeeHeader from '@/Components/hr/EmployeeHeader';
import AttendanceTable from '@/Components/hr/AttendanceTable';
import DocumentsSection from '@/Components/hr/EmployeeDocumentsSection';
import EmployeeInfoCard from '@/Components/hr/EmployeeInfoCard';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EmployeeDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Fetch employee data
  const { data: employee, error } = await supabaseAdmin
    .from('employees')
    .select(`
      *,
      departments!employees_department_id_fkey(name),
      roles(role_name)
    `)
    .eq('id', id)
    .single();

  if (error || !employee) {
    console.log('Employee not found, redirecting to 404');
    notFound();
  }

  // Fetch attendance records
  const { data: attendance } = await supabaseAdmin
    .from('attendance')
    .select('*')
    .eq('employee_id', id)
    .order('date', { ascending: false })
    .limit(50);

  // Fetch documents for this employee
  const { data: documents } = await supabaseAdmin
    .from('employee_documents')
    .select('*')
    .eq('employee_id', id)
    .single(); // Using single() since we have one row per employee now

  return (
    <div className="min-h-screen bg-[#171717] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* <EmployeeHeader employee={employee} /> */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Left Column - Employee Info */}
          <div className="lg:col-span-1">
            <EmployeeInfoCard employee={employee} />
          </div>

          {/* Right Column - Attendance & Documents */}
          <div className="lg:col-span-2 space-y-6">
            <AttendanceTable 
              attendance={attendance || []} 
              employeeId={id}
            />
            <DocumentsSection 
              documents={documents}
              employeeId={id}
            />
          </div>
        </div>
      </div>
    </div>
  );
}