import * as repo from './amigos.repo';
import * as commonRepo from '../../repositories/common.repo';

export async function enviarSolicitud({ firebaseUid, receptorId }: { firebaseUid: string; receptorId: string }) {
  const solicitanteId = await commonRepo.getUserIdByFirebaseUid(firebaseUid);
  if (!solicitanteId) {
    const err = new Error('USER_NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }

  if (solicitanteId === receptorId) {
    const err = new Error('CANNOT_REQUEST_SELF');
    (err as any).status = 400;
    throw err;
  }

  const already = await repo.areAlreadyFriends(solicitanteId, receptorId);
  if (already) {
    const err = new Error('ALREADY_FRIENDS');
    (err as any).status = 409;
    throw err;
  }

  try {
    const solicitudId = await repo.createFriendRequest(solicitanteId, receptorId);
    return { id: solicitudId };
  } catch (e: any) {
    // Puede fallar por el índice único de pendiente por par
    if (String(e?.message || '').toLowerCase().includes('unique') || String(e?.code || '').includes('2627')) {
      const err = new Error('PENDING_REQUEST_EXISTS');
      (err as any).status = 409;
      throw err;
    }
    throw e;
  }
}

const isUUID = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

export async function enviarSolicitud({ firebaseUid, receptorId }: { firebaseUid: string; receptorId: string }) {
  // 1. Identificar al solicitante (quien escanea)
  const solicitanteId = await commonRepo.getUserIdByFirebaseUid(firebaseUid);
  if (!solicitanteId) {
    const err = new Error('USER_NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }

  // 2. Resolver al receptor (el del QR)
  let targetUserId = receptorId;

  // 🟢 LÓGICA NUEVA: Si NO es un UUID, asumimos que es un Firebase UID y buscamos su ID real
  if (!isUUID(receptorId)) {
    const resolvedId = await commonRepo.getUserIdByFirebaseUid(receptorId);
    if (!resolvedId) {
        // Si no encontramos el usuario por su Firebase ID
        const err = new Error('RECEPTOR_NOT_FOUND');
        (err as any).status = 404;
        throw err;
    }
    targetUserId = resolvedId;
  }

  // --- A partir de aquí, usamos 'targetUserId' (que seguro es el UUID) ---

  if (solicitanteId === targetUserId) {
    const err = new Error('CANNOT_REQUEST_SELF');
    (err as any).status = 400;
    throw err;
  }

  const already = await repo.areAlreadyFriends(solicitanteId, targetUserId);
  if (already) {
    const err = new Error('ALREADY_FRIENDS');
    (err as any).status = 409;
    throw err;
  }

  try {
    const solicitudId = await repo.createFriendRequest(solicitanteId, targetUserId);
    return { id: solicitudId };
  } catch (e: any) {
    if (String(e?.message || '').toLowerCase().includes('unique') || String(e?.code || '').includes('2627')) {
      const err = new Error('PENDING_REQUEST_EXISTS');
      (err as any).status = 409;
      throw err;
    }
    throw e;
  }
}

export async function listarPendientesRecibidas({ firebaseUid }: { firebaseUid: string }) {
  const receptorId = await commonRepo.getUserIdByFirebaseUid(firebaseUid);
  if (!receptorId) return [];
  return repo.listPendingReceived(receptorId);
}

export async function aceptarSolicitud({ firebaseUid, solicitudId }: { firebaseUid: string; solicitudId: string }) {
  const myId = await commonRepo.getUserIdByFirebaseUid(firebaseUid);
  if (!myId) {
    const err = new Error('USER_NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }

  const solicitud = await repo.getSolicitudById(solicitudId);
  if (!solicitud) {
    const err = new Error('REQUEST_NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }
  if (solicitud.estado !== 'pendiente') {
    const err = new Error('REQUEST_NOT_PENDING');
    (err as any).status = 409;
    throw err;
  }
  if (solicitud.receptor_id !== myId) {
    const err = new Error('FORBIDDEN');
    (err as any).status = 403;
    throw err;
  }

  await repo.insertAmistad(solicitud.solicitante_id, solicitud.receptor_id);
  await repo.updateSolicitudEstado(solicitudId, 'aceptada');
  return { ok: true };
}

export async function rechazarSolicitud({ firebaseUid, solicitudId }: { firebaseUid: string; solicitudId: string }) {
  const myId = await commonRepo.getUserIdByFirebaseUid(firebaseUid);
  if (!myId) {
    const err = new Error('USER_NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }

  const solicitud = await repo.getSolicitudById(solicitudId);
  if (!solicitud) {
    const err = new Error('REQUEST_NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }
  if (solicitud.estado !== 'pendiente') {
    const err = new Error('REQUEST_NOT_PENDING');
    (err as any).status = 409;
    throw err;
  }
  if (solicitud.receptor_id !== myId) {
    const err = new Error('FORBIDDEN');
    (err as any).status = 403;
    throw err;
  }

  await repo.updateSolicitudEstado(solicitudId, 'rechazada');
  return { ok: true };
}

export async function listarAmigos({ firebaseUid }: { firebaseUid: string }) {
  const myId = await commonRepo.getUserIdByFirebaseUid(firebaseUid);
  if (!myId) return [];
  return repo.listFriends(myId);
}

export async function eliminarAmigo({ firebaseUid, amigoId }: { firebaseUid: string; amigoId: string }) {
  const myId = await commonRepo.getUserIdByFirebaseUid(firebaseUid);
  if (!myId) {
    const err = new Error('USER_NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }

  // Intentamos borrar. Si no eran amigos, simplemente no borra nada (idempotente)
  await repo.deleteFriendship(myId, amigoId);

  return { ok: true };
}


