import * as repo from './grupos.repo';
import * as amigosRepo from '../amigos/amigos.repo';
import * as commonRepo from '../../repositories/common.repo';
import { signInviteToken, verifyInviteToken } from '../../utils/invites';

export async function crearGrupo({ firebaseUid, nombre, descripcion, initialMembers }: { firebaseUid: string; nombre: string; descripcion?: string; initialMembers?: string[] }) {
  const userId = await commonRepo.getUserIdByFirebaseUid(firebaseUid);
  if (!userId) {
    const err = new Error('USER_NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }

  const grupoId = await repo.createGroup(nombre, descripcion);
  if (!grupoId) {
    const err = new Error('FAILED_TO_CREATE_GROUP');
    (err as any).status = 500;
    throw err;
  }

  // Agregar creador como admin
  await repo.addMember(grupoId, userId, 'admin');

  // Agregar miembros iniciales si se enviaron y son amigos del creador
  if (Array.isArray(initialMembers) && initialMembers.length > 0) {
    // Normalizar: quitar duplicados y el propio creador
    const unique = Array.from(new Set(initialMembers)).filter((id) => id !== userId);
    // Validar amistad
    const validations = await Promise.all(unique.map(async (candidateId) => {
      const ok = await amigosRepo.areAlreadyFriends(userId, candidateId);
      return ok ? candidateId : null;
    }));

    const validMemberIds = validations.filter((v): v is string => !!v);
    // Insertar como miembros (ignorar errores por duplicados)
    await Promise.allSettled(validMemberIds.map((memberId) => repo.addMember(grupoId, memberId, 'miembro')));
  }

  return { id: grupoId };
}

export async function obtenerMiembros({ firebaseUid, grupoId }: { firebaseUid: string; grupoId: string }) {
  const userId = await commonRepo.getUserIdByFirebaseUid(firebaseUid);
  if (!userId) {
    const err = new Error('USER_NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }
  const existe = await commonRepo.findGroupById(grupoId);
  if (!existe) {
    const err = new Error('GROUP_NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }
  const esMiembro = await commonRepo.isMember(grupoId, userId);
  if (!esMiembro) {
    const err = new Error('FORBIDDEN');
    (err as any).status = 403;
    throw err;
  }
  return repo.listMembers(grupoId);
}

export async function obtenerMisGrupos({ firebaseUid }: { firebaseUid: string }) {
  const userId = await commonRepo.getUserIdByFirebaseUid(firebaseUid);
  if (!userId) {
    const err = new Error('USER_NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }
  return repo.listGroupsForUser(userId);
}

export async function unirseAGrupo({ firebaseUid, grupoId }: { firebaseUid: string; grupoId: string }) {
  const userId = await commonRepo.getUserIdByFirebaseUid(firebaseUid);
  if (!userId) {
    const err = new Error('USER_NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }
  const existe = await commonRepo.findGroupById(grupoId);
  if (!existe) {
    const err = new Error('GROUP_NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }
  const esMiembro = await commonRepo.isMember(grupoId, userId);
  if (esMiembro) {
    const err = new Error('ALREADY_MEMBER');
    (err as any).status = 409;
    throw err;
  }
  try {
    await repo.addMember(grupoId, userId, 'miembro');
  } catch (e: any) {
    if (String(e?.code || '').includes('2627')) {
      const err = new Error('ALREADY_MEMBER');
      (err as any).status = 409;
      throw err;
    }
    throw e;
  }
  return { ok: true };
}

export async function crearInviteLink({ firebaseUid, grupoId, expiresInMinutes }: { firebaseUid: string; grupoId: string; expiresInMinutes?: number }) {
  const inviterId = await commonRepo.getUserIdByFirebaseUid(firebaseUid);
  if (!inviterId) {
    const err = new Error('USER_NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }
  const role = await repo.getMemberRole(grupoId, inviterId);
  if (!role || role !== 'admin') {
    const err = new Error('FORBIDDEN');
    (err as any).status = 403;
    throw err;
  }
  const exp = Math.floor(Date.now() / 1000) + (expiresInMinutes ? expiresInMinutes * 60 : 60 * 60);
  const token = signInviteToken({ grupoId, inviterId, exp });
  const base = process.env.APP_BASE_URL || '';
  const url = base ? `${base}/grupos/join?token=${encodeURIComponent(token)}` : undefined;
  return { token, url, exp };
}

export async function joinByInvite({ firebaseUid, token }: { firebaseUid: string; token: string }) {
  const userId = await commonRepo.getUserIdByFirebaseUid(firebaseUid);
  if (!userId) {
    const err = new Error('USER_NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }
  const payload = verifyInviteToken(token);
  if (!payload) {
    const err = new Error('INVALID_OR_EXPIRED_TOKEN');
    (err as any).status = 400;
    throw err;
  }
  const existe = await commonRepo.findGroupById(payload.grupoId);
  if (!existe) {
    const err = new Error('GROUP_NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }
  const esMiembro = await commonRepo.isMember(payload.grupoId, userId);
  if (esMiembro) return { ok: true };
  await repo.addMember(payload.grupoId, userId, 'miembro');
  return { ok: true };
}

export async function addMembers({ firebaseUid, grupoId, memberIds }: { firebaseUid: string; grupoId: string; memberIds: string[] }) {
  const adminId = await commonRepo.getUserIdByFirebaseUid(firebaseUid);
  if (!adminId) {
    const err = new Error('USER_NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }
  const role = await repo.getMemberRole(grupoId, adminId);
  if (!role || role !== 'admin') {
    const err = new Error('FORBIDDEN');
    (err as any).status = 403;
    throw err;
  }
  const unique = Array.from(new Set(memberIds)).filter((id) => id !== adminId);
  const validations = await Promise.all(unique.map(async (candidateId) => {
    const isFriend = await amigosRepo.areAlreadyFriends(adminId, candidateId);
    return isFriend ? candidateId : null;
  }));
  const validMemberIds = validations.filter((v): v is string => !!v);
  await Promise.allSettled(validMemberIds.map(async (memberId) => {
    const exists = await commonRepo.isMember(grupoId, memberId);
    if (!exists) await repo.addMember(grupoId, memberId, 'miembro');
  }));
  return { added: validMemberIds.length };
}


