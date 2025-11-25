interface FiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  departmentFilter: string;
  onDepartmentChange: (value: string) => void;
  dateFilter: string;
  onDateChange: (value: string) => void;
  onAddEmployee: () => void;
  departments: any[];
}

export default function Filters({
  searchTerm,
  onSearchChange,
  departmentFilter,
  onDepartmentChange,
  dateFilter,
  onDateChange,
  onAddEmployee,
  departments,
}: FiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Search Employee */}
      <div className="relative flex-1 min-w-[200px]">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search Employee Name"
          className="w-full sm:w-56 p-2 pl-10 rounded-lg bg-black border border-[#333333] text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Department Filter */}
      <div className="min-w-[150px]">
        <select
          value={departmentFilter}
          onChange={(e) => onDepartmentChange(e.target.value)}
          className="w-full p-2 rounded-lg bg-black border border-[#333333] text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="" className="bg-black">Department</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.name} className="bg-black">
              {dept.name}
            </option>
          ))}
        </select>
      </div>

      {/* Date Filter */}
      <div className="min-w-[150px]">
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full p-2 rounded-lg bg-black border border-[#333333] text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Add Employee Button */}
      <button
        onClick={onAddEmployee}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium text-sm"
      >
        Add Employee
      </button>
    </div>
  );
}