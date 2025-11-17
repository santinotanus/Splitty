import { api } from './client';

export async function createGroup(payload: { nombre: string; descripcion?: string; initialMembers?: string[] }) {
  const res = await api.post('/grupos', payload);
  return res.data;
}

export async function getMyGroups() {
  const res = await api.get('/grupos');
  return res.data;
}

export async function getGroupMembers(grupoId: string) {
  const res = await api.get(`/grupos/${encodeURIComponent(grupoId)}/miembros`);
  return res.data;
}

export async function joinGroup(grupoId: string) {
  const res = await api.post(`/grupos/${encodeURIComponent(grupoId)}/join`);
  return res.data;
}

export async function createInviteLink(grupoId: string, expiresInMinutes?: number) {
  let body: any = {};
  if (typeof expiresInMinutes === 'number') {
    const safe = Math.max(1, Math.min(1440, Math.floor(expiresInMinutes)));
    body = { expiresInMinutes: safe };
  }
  const res = await api.post(`/grupos/${encodeURIComponent(grupoId)}/invite-link`, body);
  return res.data;
}

export async function joinByInvite(groupId: string, inviteId: string) {
  const res = await api.post('/grupos/join-by-invite', { groupId, inviteId });
  return res.data;
}

export async function addMembers(grupoId: string, memberIds: string[]) {
  const res = await api.post(`/grupos/${encodeURIComponent(grupoId)}/add-members`, { memberIds });
  return res.data;
}

export async function getGroupBalances(grupoId: string) {
  const res = await api.get(`/grupos/${encodeURIComponent(grupoId)}/balance`);
  return res.data;
}
export async function updateGroup(grupoId: string, payload: { nombre?: string; descripcion?: string }) {
  const res = await api.put(`/grupos/${grupoId}`, payload);
  return res.data;
}

export async function removeGroupMember(grupoId: string, usuarioId: string) {
  const res = await api.delete(`/grupos/${grupoId}/miembros/${usuarioId}`);
  return res.data;
}

export async function updateMemberRole(grupoId: string, usuarioId: string, rol: string) {
  const res = await api.put(`/grupos/${grupoId}/miembros/${usuarioId}/rol`, { rol });
  return res.data;
}

export async function deleteGroup(grupoId: string) {
  const res = await api.delete(`/grupos/${grupoId}`);
  return res.data;
}

export async function getGroupStats(grupoId: string) {
  const res = await api.get(`/grupos/${grupoId}/estadisticas`);
  return res.data;
}

export default {
  createGroup,
  getGroupMembers,
  joinGroup,
  createInviteLink,
  joinByInvite,
  addMembers,
  updateGroup,
  removeGroupMember,
  updateMemberRole,
  deleteGroup,
  getGroupStats,
};