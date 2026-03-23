import apiClient from './client';

export const financeApi = {
  summary:        (params = {}) => apiClient.get('/finance/summary',  { params }).then(r => r.data),
  listIncome:     (params = {}) => apiClient.get('/finance/income',   { params }).then(r => r.data),
  listExpenses:   (params = {}) => apiClient.get('/finance/expenses', { params }).then(r => r.data),
  createIncome:   (data)        => apiClient.post('/finance/income',  data).then(r => r.data),
  createExpense:  (data)        => apiClient.post('/finance/expenses', data).then(r => r.data),
  updateIncome:   (id, data)    => apiClient.patch(`/finance/income/${id}`,   data).then(r => r.data),
  updateExpense:  (id, data)    => apiClient.patch(`/finance/expenses/${id}`, data).then(r => r.data),
  deleteIncome:   (id)          => apiClient.delete(`/finance/income/${id}`).then(r => r.data),
  deleteExpense:  (id)          => apiClient.delete(`/finance/expenses/${id}`).then(r => r.data),
};
