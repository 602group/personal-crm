import apiClient from './client';

export const usersApi = {
  list: () => apiClient.get('/users'),
  get: (id) => apiClient.get(`/users/${id}`),
  create: (data) => apiClient.post('/users', data),
  update: (id, data) => apiClient.patch(`/users/${id}`, data),
  deactivate: (id) => apiClient.patch(`/users/${id}/deactivate`),
  activate: (id) => apiClient.patch(`/users/${id}/activate`),
};
