import apiClient from './client';

export const emailApi = {
  // Accounts
  listAccounts:  ()          => apiClient.get('/email/accounts').then(r => r.data),
  addAccount:    (data)      => apiClient.post('/email/accounts', data).then(r => r.data),
  updateAccount: (id, data)  => apiClient.patch(`/email/accounts/${id}`, data).then(r => r.data),
  removeAccount: (id)        => apiClient.delete(`/email/accounts/${id}`).then(r => r.data),
  syncAccount:   (id)        => apiClient.post(`/email/accounts/${id}/sync`).then(r => r.data),
  testAccount:   (data)      => apiClient.post('/email/test', data).then(r => r.data),

  // Messages
  listMessages:  (params={}) => apiClient.get('/email/messages', { params }).then(r => r.data),
  getMessage:    (id)        => apiClient.get(`/email/messages/${id}`).then(r => r.data),
  markRead:      (id)        => apiClient.patch(`/email/messages/${id}/read`).then(r => r.data),
  markUnread:    (id)        => apiClient.patch(`/email/messages/${id}/unread`).then(r => r.data),
  toggleStar:    (id)        => apiClient.patch(`/email/messages/${id}/star`).then(r => r.data),
  deleteMessage: (id)        => apiClient.delete(`/email/messages/${id}`).then(r => r.data),
};
