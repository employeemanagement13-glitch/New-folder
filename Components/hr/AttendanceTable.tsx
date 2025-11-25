'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface AttendanceRecord {
  id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  total_hours: number | null;
  regularized: boolean;
}

interface AttendanceTableProps {
  attendance: AttendanceRecord[];
  employeeId: string;
}

export default function AttendanceTable({ attendance, employeeId }: AttendanceTableProps) {
  const [attendanceData, setAttendanceData] = useState(attendance);
  // const [loading, setLoading] = useState(false);
  // const supabase = createClientComponentClient();

  const formatTime = (time: string | null) => {
    if (!time) return '-';
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB');
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'present': return 'text-green-400';
      case 'absent': return 'text-red-400';
      case 'late': return 'text-yellow-400';
      case 'half_day': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  // const handleRegularize = async (attendanceId: string, currentStatus: boolean) => {
  //   setLoading(true);
  //   try {
  //     const { error } = await supabase
  //       .from('attendance')
  //       .update({ regularized: !currentStatus })
  //       .eq('id', attendanceId);

  //     if (!error) {
  //       setAttendanceData(prev =>
  //         prev.map(record =>
  //           record.id === attendanceId
  //             ? { ...record, regularized: !currentStatus }
  //             : record
  //         )
  //       );
  //     }
  //   } catch (error) {
  //     console.error('Error updating attendance:', error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  return (
    <div className="bg-[#111111] rounded-lg border border-[#333333]">
      <div className="p-6 border-b border-[#333333]">
        <h2 className="text-xl font-bold text-white">Attendance Records</h2>
        <p className="text-gray-400 text-sm mt-1">
          Last {attendanceData.length} records
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#333333]">
              <th className="text-left p-4 text-gray-400 font-medium">Date</th>
              <th className="text-left p-4 text-gray-400 font-medium">Check-in</th>
              <th className="text-left p-4 text-gray-400 font-medium">Check-out</th>
              <th className="text-left p-4 text-gray-400 font-medium">Status</th>
              <th className="text-left p-4 text-gray-400 font-medium">Total Hrs</th>
              {/* <th className="text-left p-4 text-gray-400 font-medium">Regularized</th>
              <th className="text-left p-4 text-gray-400 font-medium">Actions</th> */}
            </tr>
          </thead>
          <tbody>
            {attendanceData.map((record) => (
              <tr key={record.id} className="border-b border-[#333333] hover:bg-[#1a1a1a]">
                <td className="p-4 text-white">{formatDate(record.date)}</td>
                <td className="p-4 text-gray-300">{formatTime(record.check_in)}</td>
                <td className="p-4 text-gray-300">{formatTime(record.check_out)}</td>
                <td className={`p-4 font-medium ${getStatusColor(record.status)}`}>
                  {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                </td>
                <td className="p-4 text-gray-300">
                  {record.total_hours ? `${record.total_hours}h` : '-'}
                </td>
                {/* <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    record.regularized
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {record.regularized ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="p-4">
                  <button
                    onClick={() => handleRegularize(record.id, record.regularized)}
                    disabled={loading}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      record.regularized
                        ? 'bg-gray-600 hover:bg-gray-700 text-white'
                        : 'bg-[#ff9d00] hover:bg-[#e68e00] text-black'
                    }`}
                  >
                    {record.regularized ? 'Undo' : 'Regularize'}
                  </button>
                </td> */}
              </tr>
            ))}
            
            {attendanceData.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">
                  No attendance records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination/View All */}
      <div className="p-4 border-t border-[#333333]">
        <button className="w-full py-2 bg-[#333333] hover:bg-[#444444] text-white rounded font-medium transition-colors">
          View All Attendance Records
        </button>
      </div>
    </div>
  );
}