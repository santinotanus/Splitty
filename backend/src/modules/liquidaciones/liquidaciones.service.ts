import { db } from '../../config/db';
import * as repo from './liquidaciones.repo';
import * as commonRepo from '../../repositories/common.repo';

export async function crearLiquidacion({
  firebaseUid,
  grupoId,
  desde_usuario,
  hacia_usuario,
  importe,
  fecha_pago
}: {
  firebaseUid: string;
  grupoId: string;
  desde_usuario: string;
  hacia_usuario: string;
  importe: number;
  fecha_pago: string;
}) {
  const userId = await commonRepo.getUserIdByFirebaseUid(firebaseUid);
  if (!userId) {
    const err = new Error('USER_NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }

  // Validar que el grupo existe
  const grupo = await commonRepo.findGroupById(grupoId);
  if (!grupo) {
    const err = new Error('GROUP_NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }

  // Validar que el usuario es miembro del grupo
  const esMiembro = await commonRepo.isMember(grupoId, userId);
  if (!esMiembro) {
    const err = new Error('FORBIDDEN');
    (err as any).status = 403;
    throw err;
  }

  // Validar que desde_usuario es miembro del grupo
  const desdeEsMiembro = await commonRepo.isMember(grupoId, desde_usuario);
  if (!desdeEsMiembro) {
    const err = new Error('FROM_USER_NOT_MEMBER');
    (err as any).status = 400;
    throw err;
  }

  // Validar que hacia_usuario es miembro del grupo
  const haciaEsMiembro = await commonRepo.isMember(grupoId, hacia_usuario);
  if (!haciaEsMiembro) {
    const err = new Error('TO_USER_NOT_MEMBER');
    (err as any).status = 400;
    throw err;
  }

  // Validar que no sean el mismo usuario (ya está en schema, pero por seguridad)
  if (desde_usuario === hacia_usuario) {
    const err = new Error('SAME_USER');
    (err as any).status = 400;
    throw err;
  }

  const fechaPago = new Date(fecha_pago);

  // Crear liquidación en transacción
  const liquidacionId = await db.transaction(async (trx) => {
    return await repo.createSettlementWithLedger(
      trx,
      grupoId,
      desde_usuario,
      hacia_usuario,
      importe,
      fechaPago
    );
  });

  return { id: liquidacionId };
}

export async function listarLiquidaciones({
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

  return await repo.listSettlements(grupoId);
}

