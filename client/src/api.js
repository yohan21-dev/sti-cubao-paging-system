const BASE = import.meta.env.VITE_API_URL || '';

async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Multipart (for photo uploads)
async function upload(method, path, formData, token) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}/api${path}`, {
    method, headers, body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

export const api = {
  // Auth
  login:   (body)        => request('POST', '/auth/login', body),
  me:      (token)       => request('GET',  '/auth/me', null, token),

  // Departments
  getDepartments:    ()         => request('GET', '/departments'),
  getAllDepartments:  (tok)      => request('GET', '/departments/all', null, tok),
  createDepartment:  (b,tok)    => request('POST','/departments', b, tok),
  updateDepartment:  (id,b,tok) => request('PUT',`/departments/${id}`, b, tok),
  deleteDepartment:  (id,tok)   => request('DELETE',`/departments/${id}`, null, tok),

  // Faculty
  getFacultyByDept:  (deptId)      => request('GET', `/faculty/department/${deptId}`),
  getFacultyDisplay: ()            => request('GET', '/faculty/display'),
  getAllFaculty:      (tok)         => request('GET', '/faculty', null, tok),
  createFaculty:     (fd,tok)      => upload('POST','/faculty', fd, tok),
  updateFaculty:     (id,fd,tok)   => upload('PUT',`/faculty/${id}`, fd, tok),
  deleteFaculty:     (id,tok)      => request('DELETE',`/faculty/${id}`, null, tok),
  setDND:            (id, dnd)     => request('PUT',`/faculty/${id}/dnd`, { dnd }),

  // Queue
  getActiveQueue:    ()           => request('GET', '/queue/active'),
  getQueueEntry:     (id)         => request('GET', `/queue/${id}`),
  createPage:        (body)       => request('POST','/queue', body),
  acknowledgeQueue:  (id)         => request('PUT', `/queue/${id}/acknowledge`),
  doneQueue:         (id)         => request('PUT', `/queue/${id}/done`),
  cancelQueue:       (id)         => request('PUT', `/queue/${id}/cancel`),
  getLogs:           (params,tok) => request('GET', `/queue/logs?${new URLSearchParams(params)}`, null, tok),
  getStats:          (tok)        => request('GET', '/queue/stats', null, tok),

  // Settings
  getSettings:    ()      => request('GET', '/settings'),
  updateSettings: (b,tok) => request('PUT', '/settings', b, tok),

  // Admin users
  getAdminUsers:       (tok)      => request('GET', '/admin/users', null, tok),
  createAdminUser:     (b,tok)    => request('POST','/admin/users', b, tok),
  updateAdminPassword: (id,b,tok) => request('PUT', `/admin/users/${id}/password`, b, tok),
  deleteAdminUser:     (id,tok)   => request('DELETE',`/admin/users/${id}`, null, tok),

  // Schedules
  getSchedulesByFaculty:  (id,tok)      => request('GET', `/schedules/faculty/${id}`, null, tok),
  getFacultyTodaySchedule:(id)          => request('GET', `/schedules/faculty/${id}/today`),
  getAllSchedules:         (tok)         => request('GET', `/schedules/all`, null, tok),
  createSchedule:         (b,tok)       => request('POST','/schedules', b, tok),
  bulkCreateSchedules:    (b,tok)       => request('POST','/schedules/bulk', b, tok),
  updateSchedule:         (id,b,tok)    => request('PUT', `/schedules/${id}`, b, tok),
  deleteSchedule:         (id,tok)      => request('DELETE',`/schedules/${id}`, null, tok),
  clearFacultySchedules:  (id,tok)      => request('DELETE',`/schedules/faculty/${id}/all`, null, tok),

  // Student lookup
  lookupStudent: (studentNumber) => request('GET', `/students/${encodeURIComponent(studentNumber)}`),
};