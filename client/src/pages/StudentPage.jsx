import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios.js';
import TeacherCard from '../components/TeacherCard.jsx';
import PageRequestModal from '../components/PageRequestModal.jsx';

function LoadingGrid({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-4 animate-pulse">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
          <div className="h-6 bg-gray-200 rounded-full w-24" />
        </div>
      ))}
    </div>
  );
}

function DepartmentButton({ dept, selected, onClick }) {
  return (
    <button
      onClick={() => onClick(dept)}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 border ${
        selected
          ? 'bg-sti-blue text-white border-sti-blue shadow-md'
          : 'bg-white text-gray-600 border-gray-200 hover:border-sti-blue hover:text-sti-blue'
      }`}
    >
      {dept.name}
    </button>
  );
}

export default function StudentPage() {
  const [departments, setDepartments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [deptError, setDeptError] = useState('');
  const [teacherError, setTeacherError] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await api.get('/api/departments');
        setDepartments(res.data);
      } catch {
        setDeptError('Failed to load departments. Please refresh.');
      } finally {
        setLoadingDepts(false);
      }
    };
    fetchDepts();
  }, []);

  const fetchTeachers = useCallback(async (dept) => {
    setLoadingTeachers(true);
    setTeacherError('');
    setSearchQuery('');
    try {
      const url = dept ? `/api/teachers?departmentId=${dept._id || dept.id}` : '/api/teachers';
      const res = await api.get(url);
      setTeachers(res.data);
    } catch {
      setTeacherError('Failed to load teachers. Please try again.');
    } finally {
      setLoadingTeachers(false);
    }
  }, []);

  const handleDeptClick = (dept) => {
    if (selectedDept?._id === dept._id) {
      setSelectedDept(null);
      setTeachers([]);
    } else {
      setSelectedDept(dept);
      fetchTeachers(dept);
    }
  };

  const handleShowAll = () => {
    setSelectedDept(null);
    fetchTeachers(null);
  };

  const filteredTeachers = teachers.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero header */}
      <div className="bg-gradient-to-r from-sti-blue-dark via-sti-blue to-sti-blue-light text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-sti-gold rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
              <span className="text-sti-blue font-black text-lg">STI</span>
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Faculty Paging System</h1>
              <p className="text-blue-200 text-sm font-medium mt-0.5">STI College Cubao</p>
            </div>
          </div>
          <p className="text-blue-100 max-w-xl">
            Select a department and choose a faculty member to send them a paging request.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Department filter */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Filter by Department
          </h2>
          {loadingDepts ? (
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-9 w-28 bg-gray-200 rounded-full animate-pulse" />
              ))}
            </div>
          ) : deptError ? (
            <p className="text-red-500 text-sm">{deptError}</p>
          ) : (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleShowAll}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 border ${
                  !selectedDept && teachers.length > 0
                    ? 'bg-sti-blue text-white border-sti-blue shadow-md'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-sti-blue hover:text-sti-blue'
                }`}
              >
                All Teachers
              </button>
              {departments.map((dept) => (
                <DepartmentButton
                  key={dept._id || dept.id}
                  dept={dept}
                  selected={selectedDept?._id === (dept._id || dept.id)}
                  onClick={handleDeptClick}
                />
              ))}
            </div>
          )}
        </div>

        {/* Department info cards */}
        {!selectedDept && teachers.length === 0 && !loadingTeachers && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {departments.map((dept) => (
              <button
                key={dept._id || dept.id}
                onClick={() => handleDeptClick(dept)}
                className="card p-5 text-left hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-150 group"
              >
                <div className="w-10 h-10 bg-sti-blue rounded-lg flex items-center justify-center mb-3 group-hover:bg-sti-blue-light transition-colors">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 group-hover:text-sti-blue transition-colors">
                  {dept.name}
                </h3>
                {dept.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{dept.description}</p>
                )}
                <p className="text-xs text-sti-blue font-medium mt-2 group-hover:underline">
                  View teachers →
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Teachers section */}
        {(loadingTeachers || teachers.length > 0) && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                {selectedDept ? selectedDept.name : 'All Teachers'}
                {!loadingTeachers && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({filteredTeachers.length} {filteredTeachers.length === 1 ? 'teacher' : 'teachers'})
                  </span>
                )}
              </h2>
              {!loadingTeachers && teachers.length > 0 && (
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search teacher..."
                    className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sti-blue focus:border-transparent"
                  />
                </div>
              )}
            </div>

            {loadingTeachers ? (
              <LoadingGrid />
            ) : teacherError ? (
              <div className="text-center py-12 text-red-500">{teacherError}</div>
            ) : filteredTeachers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="font-medium">No teachers found</p>
                <p className="text-sm mt-1">Try a different search or department</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredTeachers.map((teacher) => (
                  <div key={teacher._id || teacher.id} className="animate-fade-in">
                    <TeacherCard teacher={teacher} onPage={setSelectedTeacher} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedTeacher && (
        <PageRequestModal teacher={selectedTeacher} onClose={() => setSelectedTeacher(null)} />
      )}
    </div>
  );
}
