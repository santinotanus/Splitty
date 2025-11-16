import { api } from './client';

export async function createExpense(groupId: string, payload: any) {
  const res = await api.post(`/groups/${encodeURIComponent(groupId)}/expenses`, payload);
  return res.data;
}

export async function listExpenses(groupId: string, params?: any) {
  const res = await api.get(`/groups/${encodeURIComponent(groupId)}/expenses`, { params });
  return res.data;
}

export async function getExpense(groupId: string, expenseId: string) {
  const res = await api.get(`/groups/${encodeURIComponent(groupId)}/expenses/${encodeURIComponent(expenseId)}`);
  return res.data;
}

export default { createExpense, listExpenses, getExpense };
