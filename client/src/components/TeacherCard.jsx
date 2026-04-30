function getInitials(teacher) {
  const first = teacher.first_name || '';
  const last = teacher.last_name || '';
  return ((first[0] || '') + (last[0] || '')).toUpperCase() || '?';
}

function getFullName(teacher) {
  return [teacher.first_name, teacher.last_name].filter(Boolean).join(' ') || 'Unknown';
}

export default function TeacherCard({ teacher, onPage }) {
  const name = getFullName(teacher);
  const deptName = teacher.department_name || teacher.department?.name || 'N/A';
  const statusLabel = teacher.status === 'unavailable' ? 'Unavailable' : null;

  return (
    <button
      onClick={() => onPage(teacher)}
      disabled={teacher.status === 'unavailable'}
      className="card w-full text-left p-4 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-150 group focus:outline-none focus:ring-2 focus:ring-sti-blue focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
    >
      {/* Avatar */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-sti-blue to-sti-blue-light flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-white font-bold text-sm">{getInitials(teacher)}</span>
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-sm leading-tight truncate group-hover:text-sti-blue transition-colors">
            {name}
          </p>
          {teacher.email && (
            <p className="text-xs text-gray-500 truncate mt-0.5">{teacher.email}</p>
          )}
        </div>
      </div>

      {/* Department badge and status */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-sti-blue bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
          {deptName}
        </span>
        {statusLabel ? (
          <span className="text-xs text-gray-400 font-medium">{statusLabel}</span>
        ) : (
          <span className="text-xs text-gray-400 group-hover:text-sti-blue transition-colors font-medium">
            Page →
          </span>
        )}
      </div>
    </button>
  );
}
