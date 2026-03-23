import apiClient from './client';

export const calendarApi = {
  list:   (params = {}) => apiClient.get('/calendar', { params }).then(r => r.data),
  get:    (id)          => apiClient.get(`/calendar/${id}`).then(r => r.data),
  create: (data)        => apiClient.post('/calendar', data).then(r => r.data),
  update: (id, data)    => apiClient.patch(`/calendar/${id}`, data).then(r => r.data),
  remove: (id)          => apiClient.delete(`/calendar/${id}`).then(r => r.data),
};
