import * as repo from './grupos.repo';
import * as amigosRepo from '../amigos/amigos.repo';
import * as commonRepo from '../../repositories/common.repo';
import admin from 'firebase-admin';

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

  await repo.addMember(grupoId, userId, 'admin');

  if (Array.isArray(initialMembers) && initialMembers.length > 0) {
    const unique = Array.from(new Set(initialMembers)).filter((id) => id !== userId);
    const validations = await Promise.all(unique.map(async (candidateId) => {
      const ok = await amigosRepo.areAlreadyFriends(userId, candidateId);
      return ok ? candidateId : null;
    }));

    const validMemberIds = validations.filter((v): v is string => !!v);
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

export async function crearInviteLink({
  firebaseUid,
  grupoId,
  expiresInMinutes
}: {
  firebaseUid: string;
  grupoId: string;
  expiresInMinutes?: number;
}) {
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

  const db = admin.firestore();

  const expirationMinutes = expiresInMinutes || 43200;
  const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

  console.log('🔥 Creando invitación en Firestore...');
  console.log('   Group ID:', grupoId);
  console.log('   Inviter ID:', inviterId);
  console.log('   Expires at:', expiresAt);

  try {
    const inviteRef = await db.collection('groupInvites').add({
      groupId: grupoId,
      inviterId: inviterId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      used: false
    });

    const inviteId = inviteRef.id;
    console.log('✅ Invitación creada con ID:', inviteId);

    const deepLink = `splitty://join?groupId=${grupoId}&inviteId=${inviteId}`;
    const base = process.env.APP_BASE_URL || 'https://splitty.app';
    const webUrl = `${base}/join?groupId=${grupoId}&inviteId=${inviteId}`;

    return {
      inviteId,
      groupId: grupoId,
      url: deepLink,
      webUrl,
      exp: Math.floor(expiresAt.getTime() / 1000),
      expiresAt: expiresAt.toISOString()
    };
  } catch (error) {
    console.error('❌ Error creando invitación en Firestore:', error);
    throw error;
  }
}

export async function joinByInvite({
  firebaseUid,
  inviteId,
  grupoId
}: {
  firebaseUid: string;
  inviteId: string;
  grupoId: string;
}) {
  const userId = await commonRepo.getUserIdByFirebaseUid(firebaseUid);
  if (!userId) {
    const err = new Error('USER_NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }

  const db = admin.firestore();

  console.log('🔍 Buscando invitación:', inviteId);

  try {
    const inviteDoc = await db.collection('groupInvites').doc(inviteId).get();

    if (!inviteDoc.exists) {
      console.log('❌ Invitación no encontrada');
      const err = new Error('INVITE_NOT_FOUND');
      (err as any).status = 404;
      throw err;
    }

    const invite = inviteDoc.data();
    console.log('✅ Invitación encontrada:', invite);

    if (!invite) {
      const err = new Error('INVITE_NOT_FOUND');
      (err as any).status = 404;
      throw err;
    }

    if (invite.groupId !== grupoId) {
      console.log('❌ Group ID no coincide');
      const err = new Error('INVITE_GROUP_MISMATCH');
      (err as any).status = 400;
      throw err;
    }

    if (invite.expiresAt.toDate() < new Date()) {
      console.log('❌ Invitación expirada');
      const err = new Error('INVITE_EXPIRED');
      (err as any).status = 400;
      throw err;
    }

    if (invite.used) {
      console.log('❌ Invitación ya usada');
      const err = new Error('INVITE_ALREADY_USED');
      (err as any).status = 400;
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
      console.log('ℹ️ Usuario ya es miembro');
      return { ok: true, alreadyMember: true };
    }

    console.log('➕ Agregando usuario al grupo...');
    await repo.addMember(grupoId, userId, 'miembro');

    console.log('🔒 Marcando invitación como usada...');
    await inviteDoc.ref.update({
      used: true,
      usedBy: userId,
      usedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ Usuario unido al grupo exitosamente');
    return { ok: true, alreadyMember: false };
  } catch (error) {
    console.error('❌ Error en joinByInvite:', error);
    throw error;
  }
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
  try {
    console.log('addMembers: adminId=', adminId, 'grupoId=', grupoId, 'requested=', memberIds, 'unique=', unique, 'validCandidates=', validMemberIds);
    await Promise.allSettled(validMemberIds.map(async (memberId) => {
      const exists = await commonRepo.isMember(grupoId, memberId);
      if (!exists) await repo.addMember(grupoId, memberId, 'miembro');
    }));
  } catch (e) {
    console.error('addMembers error while inserting members', e);
    throw e;
  }
  return { added: validMemberIds.length, validMemberIds };
}

export async function obtenerBalance({ firebaseUid, grupoId }: { firebaseUid: string; grupoId: string }) {
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
  return await repo.listBalances(grupoId);
}

// 🆕 NUEVAS FUNCIONES DE CONFIGURACIÓN
export async function actualizarGrupo({
  firebaseUid,
  grupoId,
  nombre,
  descripcion,
}: {
  firebaseUid: string;
  grupoId: string;
  nombre?: string;
  descripcion?: string;
}) {
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

  const rol = await repo.getMemberRole(grupoId, userId);
  if (!rol || rol !== 'admin') {
    const err = new Error('FORBIDDEN');
    (err as any).status = 403;
    throw err;
  }

  await repo.updateGroup(grupoId, { nombre, descripcion });

  return { ok: true };
}

export async function eliminarMiembro({
  firebaseUid,
  grupoId,
  usuarioId,
}: {
  firebaseUid: string;
  grupoId: string;
  usuarioId: string;
}) {
  // 1. Validar Admin (código que ya tenías)
  const adminId = await commonRepo.getUserIdByFirebaseUid(firebaseUid);
  if (!adminId) {
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

  const rol = await repo.getMemberRole(grupoId, adminId);
  if (!rol || rol !== 'admin') {
    const err = new Error('FORBIDDEN'); // Solo admin puede borrar
    (err as any).status = 403;
    throw err;
  }

  if (adminId === usuarioId) {
    const err = new Error('CANNOT_REMOVE_SELF');
    (err as any).status = 400;
    throw err;
  }

  // 🟢 2. NUEVA VALIDACIÓN: Verificar que el saldo sea 0
  const saldo = await repo.getUserBalance(grupoId, usuarioId);

  // Si el saldo es mayor a 0.01 (o menor a -0.01), no dejamos borrar
  if (Math.abs(saldo) > 0.01) {
    const err = new Error('CANNOT_REMOVE_MEMBER_WITH_BALANCE');
    (err as any).status = 400;
    // Este mensaje le llegará al frontend
    (err as any).message = 'No se puede eliminar al miembro porque su saldo no es 0.';
    throw err;
  }

  // 3. Proceder a eliminar (ahora usará la transacción del repo)
  await repo.removeMember(grupoId, usuarioId);

  return { ok: true };
}

export async function cambiarRolMiembro({
  firebaseUid,
  grupoId,
  usuarioId,
  rol,
}: {
  firebaseUid: string;
  grupoId: string;
  usuarioId: string;
  rol: string;
}) {
  const adminId = await commonRepo.getUserIdByFirebaseUid(firebaseUid);
  if (!adminId) {
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

  const adminRole = await repo.getMemberRole(grupoId, adminId);
  if (!adminRole || adminRole !== 'admin') {
    const err = new Error('FORBIDDEN');
    (err as any).status = 403;
    throw err;
  }

  const targetRole = await repo.getMemberRole(grupoId, usuarioId);
  if (targetRole === 'admin' && rol !== 'admin') {
    const admins = await repo.countAdmins(grupoId);
    if (admins <= 1) {
      const err = new Error('CANNOT_DEMOTE_LAST_ADMIN');
      (err as any).status = 400;
      throw err;
    }
  }

  await repo.updateMemberRole(grupoId, usuarioId, rol);

  return { ok: true };
}

export async function eliminarGrupo({
  firebaseUid,
  grupoId,
}: {
  firebaseUid: string;
  grupoId: string;
}) {
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

  const rol = await repo.getMemberRole(grupoId, userId);
  if (!rol || rol !== 'admin') {
    const err = new Error('FORBIDDEN');
    (err as any).status = 403;
    throw err;
  }

  await repo.deleteGroup(grupoId);

  return { ok: true };
}