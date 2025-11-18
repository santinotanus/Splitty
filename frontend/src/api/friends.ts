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

  // 🔥 FIX: Mapear los datos del backend a los que espera la UI
  // Asegurándonos de copiar la foto del solicitante
  if (Array.isArray(res.data)) {
    return res.data.map((s: any) => ({
      id: s.solicitudId,
      fecha: s.fecha,
      solicitanteId: s.solicitanteId,
      solicitanteNombre: s.solicitanteNombre,
      solicitanteCorreo: s.solicitanteCorreo,
      solicitanteFotoUrl: s.solicitanteFotoUrl
    }));
  }
  return [];
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

  // 🔥 FIX: Mapear los datos del backend a los que espera la UI
  // 1. Cambiamos 'nombre' a 'name'
  // 2. Copiamos 'foto_url' explícitamente
  if (Array.isArray(res.data)) {
    return res.data.map((f: any) => ({
      id: f.id,
      firebase_uid: f.firebase_uid,
      name: f.nombre,
      email: f.correo,
      foto_url: f.foto_url,

      groupsInCommon: f.gruposEnComun || 0,
      groupsNames: f.nombresGrupos || [],
    }));
  }
  return [];
}

/**
 * Buscar usuario por email en el backend.
 * GET /users/search?email=...
 */
export async function findUserByEmail(email: string) {
  const res = await api.get('/users/search', { params: { email } });
  return res.data;
}

/**
 * Conveniencia: buscar por email e invitar si se encuentra a la persona.
 * Devuelve el resultado de la creación de solicitud o lanza error.
 */
export async function inviteByEmail(email: string) {
  const user = await findUserByEmail(email);
  if (!user || !user.id) throw new Error('USER_NOT_FOUND');
  return sendFriendRequest(user.id);
}

export async function deleteFriend(amigoId: string) {
  const res = await api.delete(`/amigos/${encodeURIComponent(amigoId)}`);
  return res.data;
}

// Exportación por defecto actualizada para incluir todo
export default {
  sendFriendRequest,
  getPendingReceived,
  acceptRequest,
  rejectRequest,
  deleteFriend,
  getFriends,
  findUserByEmail,
  inviteByEmail,
};