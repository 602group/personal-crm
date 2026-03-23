import apiClient from './client';

export const profileApi = {
  get: () => apiClient.get('/profile'),
  update: (data) => apiClient.patch('/profile', data),
  changePassword: (data) => apiClient.patch('/profile/password', data),
};
