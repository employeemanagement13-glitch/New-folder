'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useParams } from 'next/navigation';

interface Employee {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  phone: string;
  address: string | null;
  department_id: string;
  employment_type: string;
  role_id: string;
  status: string;
  joining_date: string;
  created_at: string;
  updated_at: string | null;
}

interface Department {
  id: string;
  name: string;
  location: string;
}

interface Role {
  id: string;
  role_name: string;
  description: string;
}

interface EmployeeDocument {
  id: string;
  document_id: string;
  employee_id: string;
  employee_name: string;
  passportfile: string | null;
  cnic_front: string | null;
  cnic_back: string | null;
  resume: string | null;
  office_id: string | null;
  created_at: string;
  updated_at: string;
}

interface DocumentTableItem {
  id: string;
  document_id: string;
  updated: string;
  file_name: string;
  file_url: string | null;
  doc_type: string;
  file_type: string;
}

interface UploadDocument {
  id: string;
  name: string;
  field: keyof EmployeeDocument;
  current_file: string | null;
  uploaded_at: string | null;
  file_name: string | null;
}

export default function EmployeeProfile() {
  const params = useParams();
  const employeeId = params.id as string;
  const supabase = createClientComponentClient();
  
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [documents, setDocuments] = useState<EmployeeDocument | null>(null);
  const [tableDocuments, setTableDocuments] = useState<DocumentTableItem[]>([]);
  const [uploadDocuments, setUploadDocuments] = useState<UploadDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEmployeeData();
  }, [employeeId]);

  const getFileType = (fileName: string | null): string => {
    if (!fileName) return 'N/A';
    const ext = fileName.split('.').pop()?.toUpperCase();
    return ext || 'FILE';
  };

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);

      // Fetch employee data
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single();

      if (employeeError) throw employeeError;

      if (employeeData) {
        setEmployee(employeeData);
        setEditForm({
          name: employeeData.name,
          email: employeeData.email,
          phone: employeeData.phone || '',
          address: employeeData.address || ''
        });

        // Fetch department data
        const { data: departmentData, error: departmentError } = await supabase
          .from('departments')
          .select('id, name, location')
          .eq('id', employeeData.department_id)
          .single();

        if (departmentError) throw departmentError;
        setDepartment(departmentData);

        // Fetch role data
        const { data: roleData, error: roleError } = await supabase
          .from('roles')
          .select('id, role_name, description')
          .eq('id', employeeData.role_id)
          .single();

        if (roleError) throw roleError;
        setRole(roleData);

        // Fetch employee documents
        const { data: documentsData, error: documentsError } = await supabase
          .from('employee_documents')
          .select('*')
          .eq('employee_id', employeeId)
          .single();

        if (documentsError && documentsError.code !== 'PGRST116') {
          throw documentsError;
        }

        setDocuments(documentsData);

        // Transform data for table
        if (documentsData) {
          const tableDocs: DocumentTableItem[] = [
            {
              id: '1',
              document_id: documentsData.document_id,
              updated: new Date(documentsData.updated_at).toLocaleDateString('en-GB'),
              file_name: 'Passport',
              file_url: documentsData.passportfile,
              doc_type: 'Passport',
              file_type: getFileType(documentsData.passportfile)
            },
            {
              id: '2',
              document_id: documentsData.document_id,
              updated: new Date(documentsData.updated_at).toLocaleDateString('en-GB'),
              file_name: 'CNIC Front',
              file_url: documentsData.cnic_front,
              doc_type: 'CNIC Front',
              file_type: getFileType(documentsData.cnic_front)
            },
            {
              id: '3',
              document_id: documentsData.document_id,
              updated: new Date(documentsData.updated_at).toLocaleDateString('en-GB'),
              file_name: 'CNIC Back',
              file_url: documentsData.cnic_back,
              doc_type: 'CNIC Back',
              file_type: getFileType(documentsData.cnic_back)
            },
            {
              id: '4',
              document_id: documentsData.document_id,
              updated: new Date(documentsData.updated_at).toLocaleDateString('en-GB'),
              file_name: 'Office ID',
              file_url: documentsData.office_id,
              doc_type: 'Office ID',
              file_type: 'XLSX'
            },
            {
              id: '5',
              document_id: documentsData.document_id,
              updated: new Date(documentsData.updated_at).toLocaleDateString('en-GB'),
              file_name: 'Resume',
              file_url: documentsData.resume,
              doc_type: 'Resume',
              file_type: getFileType(documentsData.resume)
            }
          ];
          setTableDocuments(tableDocs);

          // Setup upload documents
          const uploadDocs: UploadDocument[] = [
            {
              id: 'passport',
              name: 'Passport',
              field: 'passportfile',
              current_file: documentsData.passportfile,
              uploaded_at: documentsData.passportfile ? documentsData.updated_at : null,
              file_name: documentsData.passportfile ? 'Passport' : null
            },
            {
              id: 'cnic_front',
              name: 'CNIC Front',
              field: 'cnic_front',
              current_file: documentsData.cnic_front,
              uploaded_at: documentsData.cnic_front ? documentsData.updated_at : null,
              file_name: documentsData.cnic_front ? 'CNIC Front' : null
            },
            {
              id: 'cnic_back',
              name: 'CNIC Back',
              field: 'cnic_back',
              current_file: documentsData.cnic_back,
              uploaded_at: documentsData.cnic_back ? documentsData.updated_at : null,
              file_name: documentsData.cnic_back ? 'CNIC Back' : null
            },
            {
              id: 'resume',
              name: 'Resume',
              field: 'resume',
              current_file: documentsData.resume,
              uploaded_at: documentsData.resume ? documentsData.updated_at : null,
              file_name: documentsData.resume ? 'Resume' : null
            },
            {
              id: 'office_id',
              name: 'Office ID',
              field: 'office_id',
              current_file: documentsData.office_id,
              uploaded_at: documentsData.office_id ? documentsData.updated_at : null,
              file_name: documentsData.office_id ? 'Office ID' : null
            }
          ];
          setUploadDocuments(uploadDocs);
        } else {
          // Initialize upload documents if no document record exists
          const uploadDocs: UploadDocument[] = [
            { id: 'passport', name: 'Passport', field: 'passportfile', current_file: null, uploaded_at: null, file_name: null },
            { id: 'cnic_front', name: 'CNIC Front', field: 'cnic_front', current_file: null, uploaded_at: null, file_name: null },
            { id: 'cnic_back', name: 'CNIC Back', field: 'cnic_back', current_file: null, uploaded_at: null, file_name: null },
            { id: 'resume', name: 'Resume', field: 'resume', current_file: null, uploaded_at: null, file_name: null },
            { id: 'office_id', name: 'Office ID', field: 'office_id', current_file: null, uploaded_at: null, file_name: null }
          ];
          setUploadDocuments(uploadDocs);
        }
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File, doc: UploadDocument) => {
    try {
      setUploading(doc.id);

      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${doc.field}_${employeeId}_${Date.now()}.${fileExt}`;
      const filePath = `employee-documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('employee-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('employee-documents')
        .getPublicUrl(filePath);

      // Update employee_documents record
      const updateData: any = {
        updated_at: new Date().toISOString(),
        [doc.field]: publicUrl
      };

      // If document record doesn't exist, create it
      if (!documents) {
        updateData.employee_id = employeeId;
        updateData.employee_name = employee?.name || '';
        updateData.document_id = `DOC_${employee?.employee_id}_${Date.now()}`;
        updateData.created_at = new Date().toISOString();
        
        const { error: insertError } = await supabase
          .from('employee_documents')
          .insert([updateData]);

        if (insertError) throw insertError;
      } else {
        const { error: updateError } = await supabase
          .from('employee_documents')
          .update(updateData)
          .eq('employee_id', employeeId);

        if (updateError) throw updateError;
      }

      // Refresh data
      await fetchEmployeeData();
      
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file. Please try again.');
    } finally {
      setUploading(null);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, doc: UploadDocument) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file, doc);
    }
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (!isEditing && employee) {
      setEditForm({
        name: employee.name,
        email: employee.email,
        phone: employee.phone || '',
        address: employee.address || ''
      });
    }
  };

  const handleSaveEdit = async () => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('employees')
        .update({
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          address: editForm.address,
          updated_at: new Date().toISOString()
        })
        .eq('id', employeeId);

      if (error) throw error;

      // Refresh employee data
      await fetchEmployeeData();
      setIsEditing(false);
      
    } catch (error) {
      console.error('Error updating employee:', error);
      alert('Error updating employee details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditFormChange = (field: string, value: string) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#171717] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-[#171717] flex items-center justify-center">
        <div className="text-white">Employee not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#171717] text-white p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 lg:mb-8">
          <h1 className="text-xl lg:text-2xl font-bold">Employee Profile</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-400">Present</span>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </div>
        </div>

        <div className="flex flex-col xl:flex-row gap-6 w-full">
          {/* Left Panel - Employee Details Card */}
          <div className="bg-[#111111] rounded-lg p-4 lg:p-6 border border-[#333333] w-full xl:w-[40%] 2xl:w-[35%]">
            <div className="space-y-4 lg:space-y-6">
              {/* ID */}
              <div>
                <label className="text-gray-400 text-sm">ID</label>
                <div className="text-white font-mono mt-1">E - {employee.employee_id}</div>
              </div>

              {/* Name */}
              <div>
                <label className="text-gray-400 text-sm">Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => handleEditFormChange('name', e.target.value)}
                    className="w-full bg-[#333333] border border-[#555555] rounded px-3 py-2 text-white mt-1 focus:outline-none focus:border-[#ff9d00]"
                  />
                ) : (
                  <div className="text-white mt-1">{employee.name}</div>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="text-gray-400 text-sm">Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => handleEditFormChange('email', e.target.value)}
                    className="w-full bg-[#333333] border border-[#555555] rounded px-3 py-2 text-white mt-1 focus:outline-none focus:border-[#ff9d00]"
                  />
                ) : (
                  <div className="text-white mt-1">{employee.email}</div>
                )}
              </div>

              {/* Department */}
              <div>
                <label className="text-gray-400 text-sm">Department</label>
                <div className="text-white mt-1">{department?.name || 'N/A'}</div>
              </div>

              {/* Role */}
              <div>
                <label className="text-gray-400 text-sm">Role</label>
                <div className="text-white mt-1">{role?.role_name || 'N/A'}</div>
              </div>

              {/* Phone */}
              <div>
                <label className="text-gray-400 text-sm">Phone</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => handleEditFormChange('phone', e.target.value)}
                    className="w-full bg-[#333333] border border-[#555555] rounded px-3 py-2 text-white mt-1 focus:outline-none focus:border-[#ff9d00]"
                  />
                ) : (
                  <div className="text-white mt-1">{employee.phone || 'N/A'}</div>
                )}
              </div>

              {/* Type */}
              <div>
                <label className="text-gray-400 text-sm">Type</label>
                <div className="text-white mt-1 capitalize">
                  {employee.employment_type?.replace('_', ' ') || 'N/A'}
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="text-gray-400 text-sm">Address</label>
                {isEditing ? (
                  <textarea
                    value={editForm.address}
                    onChange={(e) => handleEditFormChange('address', e.target.value)}
                    rows={3}
                    className="w-full bg-[#333333] border border-[#555555] rounded px-3 py-2 text-white mt-1 focus:outline-none focus:border-[#ff9d00] resize-none"
                  />
                ) : (
                  <div className="text-white mt-1">{employee.address || 'N/A'}</div>
                )}
              </div>

              {/* Document ID */}
              <div>
                <label className="text-gray-400 text-sm">Document ID</label>
                <div className="text-white font-mono mt-1 text-sm break-all">
                  {documents?.document_id || 'N/A'}
                </div>
              </div>

              {/* Edit/Save Button */}
              <div className="pt-4">
                {isEditing ? (
                  <div className="flex space-x-3">
                    <button
                      onClick={handleSaveEdit}
                      disabled={saving}
                      className="bg-[#ff9d00] cursor-pointer text-black px-4 py-2 rounded text-sm hover:bg-[#e68a00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={handleEditToggle}
                      disabled={saving}
                      className="bg-[#333333] cursor-pointer text-white px-4 py-2 rounded text-sm hover:bg-[#444444] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleEditToggle}
                    className="bg-[#ff9d00] cursor-pointer text-black px-4 py-2 rounded text-sm hover:bg-[#e68a00] transition-colors"
                  >
                    Edit Details
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Documents Section */}
          <div className="space-y-6 w-full xl:w-[60%] 2xl:w-[65%]">
            {/* Documents Table */}
            <div className="bg-[#111111] rounded-lg border border-[#333333]">
              <div className="p-4 lg:p-6 border-b border-[#333333]">
                <h2 className="text-lg font-semibold">Documents</h2>
              </div>
              
              <div className="p-4 lg:p-6 overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="text-left text-gray-400 text-sm border-b border-[#333333]">
                      <th className="pb-3 font-normal">Document ID</th>
                      <th className="pb-3 font-normal">Updated</th>
                      <th className="pb-3 font-normal">File Name</th>
                      <th className="pb-3 font-normal">File Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableDocuments.map((doc) => (
                      <tr 
                        key={doc.id} 
                        className="border-b border-[#333333] hover:bg-[#1a1a1a] cursor-pointer"
                        onClick={() => doc.file_url && window.open(doc.file_url, '_blank')}
                      >
                        <td className="py-4">
                          <div className="font-mono text-sm max-w-[120px] truncate" title={doc.document_id}>
                            {doc.document_id}
                          </div>
                        </td>
                        <td className="py-4 text-sm">{doc.updated}</td>
                        <td className="py-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm">{doc.file_name}</span>
                            {doc.file_url && (
                              <span className="text-green-500 text-xs">✓</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4">
                          <span className="text-sm text-gray-400">{doc.file_type}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Upload Section */}
            <div className="bg-[#111111] rounded-lg border border-[#333333]">
              <div className="p-4 lg:p-6 border-b border-[#333333]">
                <h2 className="text-lg font-semibold">Upload Documents</h2>
              </div>
              
              <div className="py-4 lg:py-6 px-2 lg:px-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 lg:gap-4">
                  {uploadDocuments.map((doc) => (
                    <div 
                      key={doc.id} 
                      className="border-2 border-dashed border-[#333333] rounded-lg p-4 lg:p-6 hover:border-[#ff9d00] transition-colors text-center min-w-0"
                    >
                      {/* Upload Icon - Centered */}
                      <label className="cursor-pointer block">
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, doc)}
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
                        />
                        <div className="w-12 h-12 lg:w-16 lg:h-16 bg-[#333333] rounded-full flex items-center justify-center hover:bg-[#444444] transition-colors mx-auto mb-3 lg:mb-4">
                          {uploading === doc.id ? (
                            <div className="w-4 h-4 lg:w-6 lg:h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : doc.current_file ? (
                            <svg className="w-6 h-6 lg:w-8 lg:h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-6 h-6 lg:w-8 lg:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          )}
                        </div>
                      </label>

                      {/* Selected File Name - Centered */}
                      {doc.current_file && (
                        <div className="mb-2">
                          <div className="text-xs text-green-500 truncate max-w-full" title={doc.current_file}>
                            ✓ File Uploaded
                          </div>
                        </div>
                      )}

                      {/* Document Name (Required) - Centered */}
                      <div className="text-sm font-medium mb-3 lg:mb-4 text-center">
                        {doc.name}
                        <span className="text-red-500 ml-1">*</span>
                      </div>

                      {/* Update Button - Centered */}
                      <div className="text-center">
                        <label className="cursor-pointer inline-block">
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => handleFileChange(e, doc)}
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
                          />
                          <span className={`px-3 py-1 lg:px-4 lg:py-2 rounded text-xs lg:text-sm transition-colors ${
                            doc.current_file 
                              ? 'bg-[#ff9d00] text-black hover:bg-[#e68a00]' 
                              : 'bg-[#333333] text-white hover:bg-[#444444]'
                          }`}>
                            {uploading === doc.id ? 'Uploading...' : doc.current_file ? 'Update' : 'Upload'}
                          </span>
                        </label>
                      </div>

                      {/* File Preview Link */}
                      {doc.current_file && (
                        <div className="mt-2 text-center">
                          <a
                            href={doc.current_file}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#ff9d00] text-xs hover:underline inline-flex items-center space-x-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>View</span>
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}