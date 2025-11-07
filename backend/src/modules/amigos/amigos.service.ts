import * as repo from './amigos.repo';

export async function enviarSolicitud({ firebaseUid, receptorId }: { firebaseUid: string; receptorId: string }) {
  const solicitanteId = await repo.getUserIdByFirebaseUid(firebaseUid);
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

export async function listarPendientesRecibidas({ firebaseUid }: { firebaseUid: string }) {
  const receptorId = await repo.getUserIdByFirebaseUid(firebaseUid);
  if (!receptorId) return [];
  return repo.listPendingReceived(receptorId);
}

export async function aceptarSolicitud({ firebaseUid, solicitudId }: { firebaseUid: string; solicitudId: string }) {
  const myId = await repo.getUserIdByFirebaseUid(firebaseUid);
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
  const myId = await repo.getUserIdByFirebaseUid(firebaseUid);
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
  const myId = await repo.getUserIdByFirebaseUid(firebaseUid);
  if (!myId) return [];
  return repo.listFriends(myId);
}


