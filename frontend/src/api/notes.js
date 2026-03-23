import apiClient from './client';

export const notesApi = {
  list:   (params = {}) => apiClient.get('/notes', { params }).then(r => r.data),
  get:    (id)          => apiClient.get(`/notes/${id}`).then(r => r.data),
  create: (data)        => apiClient.post('/notes', data).then(r => r.data),
  update: (id, data)    => apiClient.patch(`/notes/${id}`, data).then(r => r.data),
  remove: (id)          => apiClient.delete(`/notes/${id}`).then(r => r.data),
};
