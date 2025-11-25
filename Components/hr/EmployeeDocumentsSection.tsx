'use client';

interface DocumentRecord {
  id: string;
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

interface DocumentsSectionProps {
  documents: DocumentRecord | null;
  employeeId: string;
}

export default function DocumentsSection({ documents, employeeId }: DocumentsSectionProps) {
  const handleDownload = (fileUrl: string, fileName: string) => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  const getFileType = (fileUrl: string | null) => {
    if (!fileUrl) return 'Unknown';
    const extension = fileUrl.split('.').pop()?.toLowerCase();
    return extension || 'Unknown';
  };

  const documentTypes = [
    {
      key: 'passportfile',
      label: 'Passport',
      icon: '📘',
      description: 'Passport document in PDF format',
      fileUrl: documents?.passportfile,
      acceptedFormats: 'PDF'
    },
    {
      key: 'cnic_front',
      label: 'CNIC Front',
      icon: '🆔',
      description: 'Front side of CNIC card',
      fileUrl: documents?.cnic_front,
      acceptedFormats: 'JPG, PNG, JPEG'
    },
    {
      key: 'cnic_back',
      label: 'CNIC Back',
      icon: '🆔',
      description: 'Back side of CNIC card',
      fileUrl: documents?.cnic_back,
      acceptedFormats: 'JPG, PNG, JPEG'
    },
    {
      key: 'resume',
      label: 'Resume',
      icon: '📄',
      description: 'Employee resume/CV',
      fileUrl: documents?.resume,
      acceptedFormats: 'PDF, DOC, DOCX'
    },
    {
      key: 'office_id',
      label: 'Office ID',
      icon: '💼',
      description: 'Office identification document',
      fileUrl: documents?.office_id,
      acceptedFormats: 'PDF'
    }
  ];

  // Count how many documents are available
  const availableDocuments = documentTypes.filter(doc => doc.fileUrl).length;

  return (
    <div className="bg-[#111111] rounded-lg border border-[#333333]">
      <div className="p-6 border-b border-[#333333]">
        <h2 className="text-xl font-bold text-white">Employee Documents</h2>
        <p className="text-gray-400 text-sm mt-1">
          {availableDocuments > 0 
            ? `${availableDocuments} document(s) available` 
            : 'No documents available for this employee'
          }
        </p>
      </div>

      {/* Documents Grid - READ ONLY */}
      <div className="p-6">
        {availableDocuments > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {documentTypes.map((docType) => {
              if (!docType.fileUrl) return null;
              
              return (
                <div
                  key={docType.key}
                  className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-4 hover:border-[#ff9d00] transition-colors group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">
                      {docType.icon}
                    </span>
                    <button
                      onClick={() => handleDownload(docType.fileUrl!, docType.label)}
                      className="text-[#ff9d00] hover:text-[#e68e00] text-sm font-medium transition-colors"
                      title={`Download ${docType.label}`}
                    >
                      Download
                    </button>
                  </div>
                  
                  <h3 className="font-medium text-white mb-1">
                    {docType.label}
                  </h3>
                  
                  <p className="text-sm text-gray-300 mb-2">
                    {docType.description}
                  </p>
                  
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>Format: {getFileType(docType.fileUrl).toUpperCase()}</span>
                    <span>Available</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-4xl mb-4">
              📄
            </div>
            <p className="text-gray-400 text-lg mb-2">No Documents Available</p>
            <p className="text-gray-500 text-sm">
              This employee has no uploaded documents yet.
            </p>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-gray-500">
              <div>• Passport (PDF)</div>
              <div>• CNIC Front (Image)</div>
              <div>• CNIC Back (Image)</div>
              <div>• Resume (PDF)</div>
              <div>• Office ID (PDF)</div>
            </div>
          </div>
        )}

        {/* Show available document types even if empty */}
        {availableDocuments === 0 && (
          <div className="mt-6 pt-6 border-t border-[#333333]">
            <h3 className="text-lg font-semibold text-white mb-4">Expected Document Types</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {documentTypes.map((docType) => (
                <div
                  key={docType.key}
                  className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-4 opacity-60"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl">{docType.icon}</span>
                    <h4 className="font-medium text-white">{docType.label}</h4>
                  </div>
                  <p className="text-sm text-gray-400 mb-1">{docType.description}</p>
                  <p className="text-xs text-gray-500">Format: {docType.acceptedFormats}</p>
                  <div className="mt-2 text-xs text-red-400">
                    Not Uploaded
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}