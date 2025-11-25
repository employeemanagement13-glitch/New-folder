"use client"
import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import SectionHeader from '@/Components/SectionHeader';
import StatCard from '@/Components/StatCard';

interface Employee {
  id: string;
  name: string;
  employee_id: string;
  department_id: string;
  clerk_user_id: string;
}

interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  total_hours: number | null;
  status: string;
  regularized: boolean;
  employee: Employee;
}

interface EditFormData {
  check_in: string;
  check_out: string;
  total_hours: number;
  status: string;
}

export default function ManagerAttendanceView() {
      const params = useParams();
      const empId = (params.id) as string;
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [filteredData, setFilteredData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [managerDepartment, setManagerDepartment] = useState<string | null>(null);
  const [managerEmployeeId, setManagerEmployeeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [edits, setEdits] = useState<{ [key: string]: EditFormData }>({});

  // Check if selected date is today
  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  // Format time to AM/PM
  const formatTime = (timeString: string | null) => {
    if (!timeString) return 'Not Set';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  // Format hours display
  const formatHours = (hours: number | null) => {
    if (!hours) return '0hrs';
    return `${Math.round(hours * 100) / 100}hrs`;
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'present':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'late':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'absent':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'not set':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  // Format date to DD/MM/YY
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${day}/${month}/${year}`;
  };

  // Calculate total hours from check-in and check-out times
  const calculateTotalHours = (checkIn: string, checkOut: string): number => {
    if (!checkIn || !checkOut) return 0;
    
    const [inHours, inMinutes] = checkIn.split(':').map(Number);
    const [outHours, outMinutes] = checkOut.split(':').map(Number);
    
    const checkInTime = new Date();
    checkInTime.setHours(inHours, inMinutes, 0, 0);
    
    const checkOutTime = new Date();
    checkOutTime.setHours(outHours, outMinutes, 0, 0);
    
    const diffMs = checkOutTime.getTime() - checkInTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return Math.max(0, Math.round(diffHours * 100) / 100);
  };

  // Auto-calculate hours when check-in or check-out changes for a specific record
  const handleTimeChange = (recordId: string, field: 'check_in' | 'check_out', value: string) => {
    setEdits(prev => {
      const currentEdit = prev[recordId] || { check_in: '', check_out: '', total_hours: 0, status: 'present' };
      const updatedEdit = {
        ...currentEdit,
        [field]: value
      };

      // Auto-calculate hours if both times are set
      if (updatedEdit.check_in && updatedEdit.check_out) {
        updatedEdit.total_hours = calculateTotalHours(updatedEdit.check_in, updatedEdit.check_out);
      }

      return {
        ...prev,
        [recordId]: updatedEdit
      };
    });
  };

  // Fetch manager's department and employee ID
  const fetchManagerInfo = async () => {
    if (!user) return null;

    try {
      console.log("Fetching manager info for user:", user.id);
      
      const { data: managerData, error } = await supabaseAdmin
        .from('employees')
        .select('id, department_id')
        .eq('id', empId)
        // 'temp_1763984661519'
        .single();

      if (error) {
        console.error('Error fetching manager data:', error);
        setError('Failed to load manager information');
        return null;
      }

      console.log("Manager data found:", managerData);
      return {
        departmentId: managerData?.department_id,
        employeeId: managerData?.id
      };
    } catch (error) {
      console.error('Error in fetchManagerInfo:', error);
      setError('Error loading manager data');
      return null;
    }
  };

  // Fetch attendance data for department employees (excluding manager)
  const fetchAttendanceData = async (departmentId: string, date: string, managerEmployeeId: string) => {
    try {
      console.log("Fetching attendance for department:", departmentId, "on date:", date);
      
      // Get all active employees in the department EXCEPT the manager
      const { data: employees, error: employeesError } = await supabaseAdmin
        .from('employees')
        .select('id, name, employee_id, department_id, clerk_user_id')
        .eq('department_id', departmentId)
        .eq('status', 'active')
        .neq('id', managerEmployeeId);

      if (employeesError) {
        console.error('Error fetching employees:', employeesError);
        setError('Failed to load employees');
        return [];
      }

      if (!employees || employees.length === 0) {
        console.log("No employees found in department");
        return [];
      }

      const employeeIds = employees.map(emp => emp.id);
      console.log("Employee IDs:", employeeIds);

      // Get attendance records for these employees on the selected date
      const { data: attendanceRecords, error: attendanceError } = await supabaseAdmin
        .from('attendance')
        .select('*')
        .in('employee_id', employeeIds)
        .eq('date', date);

      if (attendanceError) {
        console.error('Error fetching attendance:', attendanceError);
        setError('Failed to load attendance records');
        return [];
      }

      console.log("Attendance records found:", attendanceRecords?.length);

      // Combine employee data with attendance records
      const combinedData = employees.map(employee => {
        const attendance = attendanceRecords?.find(record => record.employee_id === employee.id);
        
        if (attendance) {
          return {
            ...attendance,
            employee: employee
          };
        } else {
          // If no attendance record exists, create a record with "Not Set" status
          return {
            id: `not-set-${employee.id}-${date}`,
            employee_id: employee.id,
            date: date,
            check_in: null,
            check_out: null,
            total_hours: null,
            status: 'Not Set',
            regularized: false,
            employee: employee
          };
        }
      });

      return combinedData;
    } catch (error) {
      console.error('Error in fetchAttendanceData:', error);
      setError('Error loading attendance data');
      return [];
    }
  };

  // Start editing an attendance record
  const startEditing = (record: AttendanceRecord) => {
    setEdits(prev => ({
      ...prev,
      [record.id]: {
        check_in: record.check_in || '09:00',
        check_out: record.check_out || '17:00',
        total_hours: record.total_hours || calculateTotalHours('09:00', '17:00'),
        status: record.status === 'Not Set' ? 'present' : record.status
      }
    }));
  };

  // Cancel editing for a specific record
  const cancelEditing = (recordId: string) => {
    setEdits(prev => {
      const newEdits = { ...prev };
      delete newEdits[recordId];
      return newEdits;
    });
  };

  // Save all attendance records
  const saveAllAttendance = async () => {
    if (Object.keys(edits).length === 0) {
      setError('No changes to save');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const savePromises = Object.entries(edits).map(async ([recordId, editData]) => {
        const originalRecord = attendanceData.find(record => record.id === recordId);
        
        if (!originalRecord) {
          throw new Error(`Record not found: ${recordId}`);
        }

        const attendanceDataToSave = {
          employee_id: originalRecord.employee_id,
          date: selectedDate,
          check_in: editData.check_in,
          check_out: editData.check_out,
          total_hours: editData.total_hours,
          status: editData.status,
          regularized: false,
          updated_at: new Date().toISOString()
        };

        if (originalRecord.id.startsWith('not-set-')) {
          // Insert new record
          const { data, error } = await supabaseAdmin
            .from('attendance')
            .insert([attendanceDataToSave])
            .select()
            .single();

          if (error) throw error;
          return data;
        } else {
          // Update existing record
          const { data, error } = await supabaseAdmin
            .from('attendance')
            .update(attendanceDataToSave)
            .eq('id', originalRecord.id)
            .select()
            .single();

          if (error) throw error;
          return data;
        }
      });

      const results = await Promise.all(savePromises);

      // Update local state
      setAttendanceData(prev => 
        prev.map(item => {
          const edit = edits[item.id];
          if (edit) {
            const result = results.find(r => r.employee_id === item.employee_id);
            return result ? { ...result, employee: item.employee } : item;
          }
          return item;
        })
      );

      setSuccess(`Successfully updated ${Object.keys(edits).length} attendance records`);
      setEdits({});
    } catch (error) {
      console.error('Error saving attendance:', error);
      setError('Failed to save attendance records');
    } finally {
      setSaving(false);
    }
  };

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      if (!isLoaded) return;
      if (!user) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        // Get manager's info
        const managerInfo = await fetchManagerInfo();
        if (managerInfo && managerInfo.departmentId && managerInfo.employeeId) {
          setManagerDepartment(managerInfo.departmentId);
          setManagerEmployeeId(managerInfo.employeeId);

          // Fetch attendance data
          const data = await fetchAttendanceData(
            managerInfo.departmentId, 
            selectedDate, 
            managerInfo.employeeId
          );
          setAttendanceData(data);
          setFilteredData(data);
        } else {
          setError('Manager information not found. Please ensure you are assigned as a department manager.');
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Failed to load attendance data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, isLoaded]);

  // Refresh data when date changes
  useEffect(() => {
    const refreshData = async () => {
      if (!managerDepartment || !managerEmployeeId) return;

      setLoading(true);
      setError(null);
      setEdits({});
      
      try {
        const data = await fetchAttendanceData(managerDepartment, selectedDate, managerEmployeeId);
        setAttendanceData(data);
        setFilteredData(data);
      } catch (error) {
        console.error('Error refreshing data:', error);
        setError('Failed to refresh data');
      } finally {
        setLoading(false);
      }
    };

    refreshData();
  }, [selectedDate, managerDepartment, managerEmployeeId]);

  // Filter data based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredData(attendanceData);
      return;
    }

    const filtered = attendanceData.filter(record =>
      record.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredData(filtered);
  }, [searchTerm, attendanceData]);

  // Handle view button click
  const handleViewEmployee = (employeeId: string) => {
    if (managerEmployeeId) {
      router.push(`/manager/${managerEmployeeId}/attendance/${employeeId}`);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#171717] text-white p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff9d00]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#171717] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
          <SectionHeader title={isToday ? 'Today Attendance' : 'Attendance'} actions={
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Search Bar */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black border border-[#333333] rounded-lg px-4 py-2 text-white transition-colors"
              />
            </div>
            
            {/* Date Filter */}
            <div className="flex gap-4 items-center">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-black border border-[#333333] rounded-lg px-4 py-2 text-white transition-colors scheme-dark"
                />
            </div>

            {/* Save All Button */}
            <button
              onClick={saveAllAttendance}
              disabled={saving || Object.keys(edits).length === 0}
              className="bg-[#ff9d00] hover:bg-[#ffb340] text-black px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {saving ? 'Saving...' : `Save Changes (${Object.keys(edits).length})`}
            </button>
          </div>
          } />

        {/* Success Message */}
        {/* {success && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
            <div className="text-green-400 text-sm">{success}</div>
          </div>
        )} */}

        {/* Error Message */}
        {/* {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
            <div className="text-red-400 text-sm">{error}</div>
          </div>
        )} */}

        {/* Debug Info */}
        {/* {process.env.NODE_ENV === 'development' && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
            <div className="text-yellow-400 text-sm">
              <strong>Debug Info:</strong> Manager ID: {managerEmployeeId || 'Not found'} | 
              Department: {managerDepartment || 'Not found'} | 
              Date: {selectedDate} | 
              Records: {filteredData.length} | 
              Edits: {Object.keys(edits).length}
            </div>
          </div>
        )} */}

        {/* Attendance Table */}
        <div className="bg-[#111111] rounded-lg border border-[#333333] overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff9d00]"></div>
              <span className="ml-2 text-gray-400">Loading attendance data...</span>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="grid grid-cols-8 gap-4 px-6 py-4 bg-[#1a1a1a] border-b border-[#333333] text-sm font-medium text-gray-400">
                <div>Employee</div>
                <div>Emp ID</div>
                <div>Date</div>
                <div>Check In</div>
                <div>Check Out</div>
                <div>Hours</div>
                <div>Status</div>
                <div>Actions</div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-[#333333]">
                {filteredData.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    {attendanceData.length === 0 
                      ? "No employees found in your department" 
                      : "No attendance records match your search"}
                  </div>
                ) : (
                  filteredData.map((record) => {
                    const isEditing = edits[record.id];
                    const currentData = isEditing ? edits[record.id] : record;

                    return (
                      <div
                        key={record.id}
                        className="grid grid-cols-8 gap-4 px-6 py-4 hover:bg-[#1a1a1a] transition-colors items-center"
                      >
                        {/* Employee Name */}
                        <div className="text-white font-medium">
                          {record.employee.name}
                        </div>

                        {/* Employee ID */}
                        <div className="text-gray-400 text-sm break-all whitespace-normal min-w-0">
                          {record.employee.employee_id}
                        </div>

                        {/* Date */}
                        <div className="text-gray-400 text-sm">
                          {formatDate(record.date)}
                        </div>

                        {/* Check In */}
                        <div className="text-gray-400 text-sm">
                          {isEditing ? (
                            <input
                              type="time"
                              value={currentData.check_in as string}
                              onChange={(e) => handleTimeChange(record.id, 'check_in', e.target.value)}
                              className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-[#ff9d00]"
                            />
                          ) : (
                            formatTime(record.check_in)
                          )}
                        </div>

                        {/* Check Out */}
                        <div className="text-gray-400 text-sm">
                          {isEditing ? (
                            <input
                              type="time"
                              value={currentData.check_out as string}
                              onChange={(e) => handleTimeChange(record.id, 'check_out', e.target.value)}
                              className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-[#ff9d00]"
                            />
                          ) : (
                            formatTime(record.check_out)
                          )}
                        </div>

                        {/* Hours */}
                        <div className="text-gray-400 text-sm">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="24"
                              value={currentData.total_hours as number}
                              onChange={(e) => setEdits(prev => ({
                                ...prev,
                                [record.id]: {
                                  ...prev[record.id],
                                  total_hours: parseFloat(e.target.value) || 0
                                }
                              }))}
                              className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-[#ff9d00]"
                            />
                          ) : (
                            formatHours(record.total_hours)
                          )}
                        </div>

                        {/* Status */}
                        <div className="flex items-center gap-3">
                          {isEditing ? (
                            <select
                              value={currentData.status}
                              onChange={(e) => setEdits(prev => ({
                                ...prev,
                                [record.id]: {
                                  ...prev[record.id],
                                  status: e.target.value
                                }
                              }))}
                              className="w-full bg-[#1a1a1a] border border-[#333333] rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-[#ff9d00]"
                            >
                              <option value="present">Present</option>
                              <option value="late">Late</option>
                              <option value="absent">Absent</option>
                            </select>
                          ) : (
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                                record.status
                              )}`}
                            >
                              {record.status}
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          {isEditing ? (
                            <button
                              onClick={() => cancelEditing(record.id)}
                              className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
                            >
                              Cancel
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditing(record)}
                                className="text-[#ff9d00] cursor-pointer font-medium text-sm hover:text-[#ff9d00]/90 transition-colors"
                              >
                                Edit
                              </button>
                              <span className="text-gray-600">|</span>
                              <button
                                onClick={() => handleViewEmployee(record.employee.id)}
                                className="text-[#ff9d00] cursor-pointer font-medium text-sm hover:text-[#ff9d00]/90 transition-colors"
                              >
                                View
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* Summary Stats */}
        {!loading && filteredData.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-4">
            <StatCard title='Total Employees' value={filteredData.length} />
            <StatCard title='Present' value={filteredData.filter(record => record.status === 'present').length} />
            <StatCard title='Late' value={filteredData.filter(record => record.status === 'late').length} />
            <StatCard title='Absent' value={filteredData.filter(record => record.status === 'absent').length} />
          </div>
        )}
      </div>
    </div>
  );
}