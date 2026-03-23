import apiClient from './client';

export const projectsApi = {
  list:   (params = {}) => apiClient.get('/projects', { params }).then(r => r.data),
  get:    (id)          => apiClient.get(`/projects/${id}`).then(r => r.data),
  create: (data)        => apiClient.post('/projects', data).then(r => r.data),
  update: (id, data)    => apiClient.patch(`/projects/${id}`, data).then(r => r.data),
  remove: (id)          => apiClient.delete(`/projects/${id}`).then(r => r.data),
};
