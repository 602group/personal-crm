import apiClient from './client';

export const tasksApi = {
  list:   (params = {}) => apiClient.get('/tasks', { params }).then(r => r.data),
  get:    (id)          => apiClient.get(`/tasks/${id}`).then(r => r.data),
  create: (data)        => apiClient.post('/tasks', data).then(r => r.data),
  update: (id, data)    => apiClient.patch(`/tasks/${id}`, data).then(r => r.data),
  remove: (id)          => apiClient.delete(`/tasks/${id}`).then(r => r.data),
};
