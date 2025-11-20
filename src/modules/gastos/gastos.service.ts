import { db } from '../../config/db';
import * as repo from './gastos.repo';
import * as commonRepo from '../../repositories/common.repo';

export async function crearGasto({
  firebaseUid,
  grupoId,
  pagadorId,
  descripcion,
  importe,
  lugar,
  fecha_pago,
  participantes
}: {
  firebaseUid: string;
  grupoId: string;
  pagadorId: string;
  descripcion?: string;
  importe: number;
  lugar?: string;
  fecha_pago?: string;
  participantes: Array<{ usuarioId: string; parte_importe?: number; parte_porcentaje?: number }>;
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

  // Validar que el pagador es miembro del grupo
  const pagadorEsMiembro = await commonRepo.isMember(grupoId, pagadorId);
  if (!pagadorEsMiembro) {
    const err = new Error('PAYER_NOT_MEMBER');
    (err as any).status = 400;
    throw err;
  }

  // Validar que todos los participantes son miembros del grupo
  for (const p of participantes) {
    const esMiembroParticipante = await commonRepo.isMember(grupoId, p.usuarioId);
    if (!esMiembroParticipante) {
      const err = new Error(`PARTICIPANT_NOT_MEMBER: ${p.usuarioId}`);
      (err as any).status = 400;
      throw err;
    }
  }

  // Calcular partes si se usa porcentaje
  const participantesCalculados = participantes.map((p) => {
    if (p.parte_importe !== undefined) {
      return { usuarioId: p.usuarioId, parte_importe: p.parte_importe, parte_porcentaje: null };
    } else if (p.parte_porcentaje !== undefined) {
      const parte_importe = (importe * p.parte_porcentaje) / 100;
      return { usuarioId: p.usuarioId, parte_importe, parte_porcentaje: p.parte_porcentaje };
    } else {
      const err = new Error('INVALID_PARTICIPANT_DATA');
      (err as any).status = 400;
      throw err;
    }
  });

  // Validar que la suma de partes no exceda el importe (con tolerancia pequeña por redondeo)
  const sumaPartes = participantesCalculados.reduce((sum, p) => sum + (p.parte_importe || 0), 0);
  const diferencia = Math.abs(sumaPartes - importe);
  if (diferencia > 0.01) {
    const err = new Error('PARTS_SUM_MISMATCH');
    (err as any).status = 400;
    throw err;
  }

  const fechaPago = fecha_pago ? new Date(fecha_pago) : new Date();

  // Crear gasto en transacción
  const gastoId = await db.transaction(async (trx) => {
    return await repo.createExpenseWithDivisions(
      trx,
      grupoId,
      pagadorId,
      descripcion || null,
      importe,
      lugar || null,
      fechaPago,
      participantesCalculados
    );
  });

  return { id: gastoId };
}

export async function listarGastos({
  firebaseUid,
  grupoId,
  page,
  limit,
  fechaDesde,
  fechaHasta
}: {
  firebaseUid: string;
  grupoId: string;
  page?: number;
  limit?: number;
  fechaDesde?: string;
  fechaHasta?: string;
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

  const options: any = {};
  if (page) options.page = page;
  if (limit) options.limit = limit;
  if (fechaDesde) options.fechaDesde = new Date(fechaDesde);
  if (fechaHasta) options.fechaHasta = new Date(fechaHasta);

  return await repo.listExpenses(grupoId, options);
}

export async function obtenerGasto({
  firebaseUid,
  grupoId,
  expenseId
}: {
  firebaseUid: string;
  grupoId: string;
  expenseId: string;
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

  const gasto = await repo.getExpenseById(expenseId, grupoId);
  if (!gasto) {
    const err = new Error('EXPENSE_NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }

  return gasto;
}

