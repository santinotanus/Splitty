import { api } from './client';

/**
 * Get my balance in a group
 * GET /groups/:groupId/my/balance
 */
export async function getMyBalance(groupId: string) {
  const res = await api.get(`/groups/${encodeURIComponent(groupId)}/my/balance`);
  return res.data;
}

/**
 * Get my debts in a group (who I owe and how much)
 * GET /groups/:groupId/my/debts
 */
export async function getMyDebts(groupId: string) {
  const res = await api.get(`/groups/${encodeURIComponent(groupId)}/my/debts`);
  return res.data;
}

/**
 * Get my credits in a group (who owes me and how much)
 * GET /groups/:groupId/my/credits
 */
export async function getMyCredits(groupId: string) {
  const res = await api.get(`/groups/${encodeURIComponent(groupId)}/my/credits`);
  return res.data;
}

/**
 * Get a summary for the group (aggregated balances/debts)
 * GET /groups/:groupId/summary
 */
export async function getGroupSummary(groupId: string) {
  const res = await api.get(`/groups/${encodeURIComponent(groupId)}/summary`);
  return res.data;
}

export default {
  getMyBalance,
  getMyDebts,
  getMyCredits,
  getGroupSummary,
};
