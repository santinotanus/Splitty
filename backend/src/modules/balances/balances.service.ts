import * as repo from './balances.repo';
import * as commonRepo from '../../repositories/common.repo';

export async function obtenerMiBalance({
  firebaseUid,
  grupoId
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

  const grupo = await commonRepo.findGroupById(grupoId);
  if (!grupo) {
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

  const balance = await repo.getMyBalance(grupoId, userId);
  return { balance };
}

export async function obtenerMisDeudas({
  firebaseUid,
  grupoId
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

  const grupo = await commonRepo.findGroupById(grupoId);
  if (!grupo) {
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

  return await repo.getMyDebts(grupoId, userId);
}

export async function obtenerMisCreditos({
  firebaseUid,
  grupoId
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

  const grupo = await commonRepo.findGroupById(grupoId);
  if (!grupo) {
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

  return await repo.getMyCredits(grupoId, userId);
}

export async function obtenerResumen({
  firebaseUid,
  grupoId
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

  const grupo = await commonRepo.findGroupById(grupoId);
  if (!grupo) {
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

  return await repo.getGroupSummary(grupoId);
}

