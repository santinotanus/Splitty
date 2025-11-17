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

/**
 * Upload a receipt image (base64) for a debt between deudor and acreedor in a group
 * POST /groups/:groupId/receipts
 */
export async function uploadReceipt(groupId: string, deudorId: string, acreedorId: string, filename: string | undefined, base64Data: string) {
  const payload = { deudorId, acreedorId, filename, data: base64Data };
  const res = await api.post(`/groups/${encodeURIComponent(groupId)}/receipts`, payload);
  return res.data;
}

/**
 * Submit to backend a URL for a previously-uploaded receipt (client-side upload)
 */
export async function uploadReceiptUrl(groupId: string, deudorId: string, acreedorId: string, filename: string | undefined, url: string) {
  const payload = { deudorId, acreedorId, filename, url };
  const res = await api.post(`/groups/${encodeURIComponent(groupId)}/receipts`, payload);
  return res.data;
}

export default {
  getMyBalance,
  getMyDebts,
  getMyCredits,
  getGroupSummary,
};
