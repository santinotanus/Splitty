import { api } from './client';

/**
 * Create a settlement (liquidacion)
 * POST /groups/:groupId/settlements
 * body: { desde_usuario, hacia_usuario, importe, fecha_pago }
 */
export async function createSettlement(groupId: string, payload: { desde_usuario: string; hacia_usuario: string; importe: number; fecha_pago: string }) {
  const res = await api.post(`/groups/${encodeURIComponent(groupId)}/settlements`, payload);
  return res.data;
}

/**
 * List settlements for a group
 * GET /groups/:groupId/settlements
 */
export async function listSettlements(groupId: string) {
  const res = await api.get(`/groups/${encodeURIComponent(groupId)}/settlements`);
  return res.data;
}

export default {
  createSettlement,
  listSettlements,
};
