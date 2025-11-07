import { api } from './client';

/**
 * Send a friend request
 * POST /amigos/solicitudes { receptorId }
 * returns { id }
 */
export async function sendFriendRequest(receptorId: string) {
  const res = await api.post('/amigos/solicitudes', { receptorId });
  return res.data;
}

/**
 * List pending received friend requests
 * GET /amigos/solicitudes/recibidas
 */
export async function getPendingReceived() {
  const res = await api.get('/amigos/solicitudes/recibidas');
  return res.data;
}

/**
 * Accept a friend request
 * POST /amigos/solicitudes/:solicitudId/aceptar
 */
export async function acceptRequest(solicitudId: string) {
  const res = await api.post(`/amigos/solicitudes/${encodeURIComponent(solicitudId)}/aceptar`);
  return res.data;
}

/**
 * Reject a friend request
 * POST /amigos/solicitudes/:solicitudId/rechazar
 */
export async function rejectRequest(solicitudId: string) {
  const res = await api.post(`/amigos/solicitudes/${encodeURIComponent(solicitudId)}/rechazar`);
  return res.data;
}

/**
 * List friends
 * GET /amigos
 */
export async function getFriends() {
  const res = await api.get('/amigos');
  return res.data;
}

export default {
  sendFriendRequest,
  getPendingReceived,
  acceptRequest,
  rejectRequest,
  getFriends,
};
