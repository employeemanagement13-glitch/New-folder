// components/DataTable.tsx
'use client';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  onRowClick?: (row: any) => void;
}

export default function DataTable({
  columns,
  data,
  loading = false,
  emptyMessage = "No data available",
  className = "",
  onRowClick
}: DataTableProps) {
  if (loading) {
    return (
      <div className={`bg-[#111111] rounded-xl border border-[#333333] ${className}`}>
        <div className="animate-pulse">
          <div className="h-12 bg-[#1a1a1a] rounded-t-xl"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 border-b border-[#333333] bg-[#111111]"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-[#111111] rounded-xl border border-[#333333] overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-[#1a1a1a]">
            <tr>
              {columns.map((column) => (
                <th 
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-medium text-white tracking-wider border-b border-[#333333]"
                  // uppercase
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#333333]">
            {data.length > 0 ? (
              data.map((row, index) => (
                <tr 
                  key={index}
                  className={`text-sm text-white hover:bg-[#1a1a1a] transition-colors ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => (
                    <td 
                      key={column.key}
                      className="px-6 py-4 whitespace-nowrap border-b border-[#333333]"
                    >
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr className="bg-[#111111]">
                <td 
                  colSpan={columns.length} 
                  className="px-6 py-8 text-center text-white/70 border-b border-[#333333]"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}