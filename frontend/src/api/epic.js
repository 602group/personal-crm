import apiClient from './client';

export const epicApi = {
  // Tasks
  listTasks:   (params) => apiClient.get('/epic/tasks', { params }).then(r => r.data),
  createTask:  (data) => apiClient.post('/epic/tasks', data).then(r => r.data),
  updateTask:  (id, data) => apiClient.patch(`/epic/tasks/${id}`, data).then(r => r.data),
  deleteTask:  (id) => apiClient.delete(`/epic/tasks/${id}`).then(r => r.data),
  
  // Links
  listLinks:   () => apiClient.get('/epic/links').then(r => r.data),
  createLink:  (data) => apiClient.post('/epic/links', data).then(r => r.data),
  updateLink:  (id, data) => apiClient.patch(`/epic/links/${id}`, data).then(r => r.data),
  deleteLink:  (id) => apiClient.delete(`/epic/links/${id}`).then(r => r.data),
};
