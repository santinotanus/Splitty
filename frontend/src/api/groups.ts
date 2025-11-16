import { api } from './client';

/**
 * Create a new group
 * POST /grupos
 * body: { nombre, descripcion?, initialMembers? }
 * returns: { id }
 */
export async function createGroup(payload: { nombre: string; descripcion?: string; initialMembers?: string[] }) {
  const res = await api.post('/grupos', payload);
  return res.data;
}

/**
 * Get groups that belong to the authenticated user
 * GET /grupos
 */
export async function getMyGroups() {
  const res = await api.get('/grupos');
  return res.data;
}

/**
 * Get members of a group
 * GET /grupos/:grupoId/miembros
 */
export async function getGroupMembers(grupoId: string) {
  const res = await api.get(`/grupos/${encodeURIComponent(grupoId)}/miembros`);
  return res.data;
}

/**
 * Join a group
 * POST /grupos/:grupoId/join
 */
export async function joinGroup(grupoId: string) {
  const res = await api.post(`/grupos/${encodeURIComponent(grupoId)}/join`);
  return res.data;
}

/**
 * Create invite link for a group
 * POST /grupos/:grupoId/invite-link
 * body: { expiresInMinutes? }
 * returns { token, url, exp }
 */
export async function createInviteLink(grupoId: string, expiresInMinutes?: number) {
  // Backend validates expiresInMinutes must be between 1 and 1440 (minutes).
  // Defensive: clamp and floor the provided value to avoid server VALIDATION_ERROR (too_big / too_small).
  let body: any = {};
  if (typeof expiresInMinutes === 'number') {
    const safe = Math.max(1, Math.min(1440, Math.floor(expiresInMinutes)));
    body = { expiresInMinutes: safe };
  }
  const res = await api.post(`/grupos/${encodeURIComponent(grupoId)}/invite-link`, body);
  return res.data;
}

/**
 * Join a group using invite token
 * POST /grupos/join-by-invite
 * body: { token }
 */
export async function joinByInvite(token: string) {
  const res = await api.post('/grupos/join-by-invite', { token });
  return res.data;
}

/**
 * Add multiple members to a group (admin)
 * POST /grupos/:grupoId/add-members
 * body: { memberIds: string[] }
 * returns { added: number }
 */
export async function addMembers(grupoId: string, memberIds: string[]) {
  const res = await api.post(`/grupos/${encodeURIComponent(grupoId)}/add-members`, { memberIds });
  return res.data;
}

/**
 * Get balances per member for a group
 */
export async function getGroupBalances(grupoId: string) {
  const res = await api.get(`/grupos/${encodeURIComponent(grupoId)}/balance`);
  return res.data;
}

export default {
  createGroup,
  getGroupMembers,
  joinGroup,
  createInviteLink,
  joinByInvite,
  addMembers,
};
