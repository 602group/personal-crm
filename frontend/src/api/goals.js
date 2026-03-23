import apiClient from './client';

export const goalsApi = {
  list:          (params = {}) => apiClient.get('/goals', { params }).then(r => r.data),
  get:           (id)          => apiClient.get(`/goals/${id}`).then(r => r.data),
  create:        (data)        => apiClient.post('/goals', data).then(r => r.data),
  update:        (id, data)    => apiClient.patch(`/goals/${id}`, data).then(r => r.data),
  remove:        (id)          => apiClient.delete(`/goals/${id}`).then(r => r.data),
  linkProject:   (id, projectId) => apiClient.post(`/goals/${id}/projects`, { projectId }).then(r => r.data),
  unlinkProject: (id, pid)       => apiClient.delete(`/goals/${id}/projects/${pid}`).then(r => r.data),
  linkTask:      (id, taskId)    => apiClient.post(`/goals/${id}/tasks`, { taskId }).then(r => r.data),
  unlinkTask:    (id, tid)       => apiClient.delete(`/goals/${id}/tasks/${tid}`).then(r => r.data),
};
