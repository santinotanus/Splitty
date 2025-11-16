import { db } from '../../config/db';
import { Knex } from 'knex';

export async function createExpenseWithDivisions(
  trx: Knex.Transaction,
  grupoId: string,
  pagadorId: string,
  descripcion: string | null,
  importe: number,
  lugar: string | null,
  fecha_pago: Date,
  participantes: Array<{ usuarioId: string; parte_importe: number | null; parte_porcentaje: number | null }>
) {
  // 1. Insertar gasto
  // Normalize fecha_pago to null if undefined (prevents driver/DB errors)
  const fechaParam = fecha_pago ?? null;

  const gastoResult = await trx.raw(
    `INSERT INTO dbo.gastos (id, grupo_id, pagador_id, descripcion, importe, lugar, fecha_pago)
     OUTPUT inserted.id
     VALUES (NEWID(), ?, ?, ?, ?, ?, ?)`,
    [grupoId, pagadorId, descripcion, importe, lugar, fechaParam]
  );

  // Different drivers/knex versions return different shapes. Be defensive.
  let gastoId: string | undefined;
  try {
    gastoId = gastoResult?.recordset?.[0]?.id || gastoResult?.[0]?.[0]?.id || gastoResult?.[0]?.id;
  } catch (e) {
    gastoId = undefined;
  }

  if (!gastoId) {
    throw new Error('FAILED_TO_CREATE_EXPENSE');
  }

  // 2. Insertar divisiones
  for (const p of participantes) {
    await trx('dbo.divisiones_gasto').insert({
      gasto_id: gastoId,
      grupo_id: grupoId,
      usuario_id: p.usuarioId,
      parte_importe: p.parte_importe,
      parte_porcentaje: p.parte_porcentaje
    });
  }

  // 3. Insertar asientos en ledger
  // Pagador: crédito (C) por el importe total pagado
  await trx.raw(
    `INSERT INTO dbo.ledger (id, grupo_id, usuario_id, tipo_origen, gasto_id, direccion, importe, fecha)
     VALUES (NEWID(), ?, ?, 'gasto', ?, 'C', ?, SYSUTCDATETIME())`,
    [grupoId, pagadorId, gastoId, importe]
  );

  // Cada participante: débito (D) por su parte
  for (const p of participantes) {
    const parteImporte = p.parte_importe ?? (p.parte_porcentaje ? (importe * p.parte_porcentaje / 100) : 0);
    if (parteImporte > 0) {
      await trx.raw(
        `INSERT INTO dbo.ledger (id, grupo_id, usuario_id, tipo_origen, gasto_id, direccion, importe, fecha)
         VALUES (NEWID(), ?, ?, 'gasto', ?, 'D', ?, SYSUTCDATETIME())`,
        [grupoId, p.usuarioId, gastoId, parteImporte]
      );
    }
  }

  return gastoId;
}

export async function listExpenses(
  grupoId: string,
  options?: { page?: number; limit?: number; fechaDesde?: Date; fechaHasta?: Date }
) {
  let query = db('dbo.gastos as g')
    .join('dbo.usuarios as u', 'u.id', 'g.pagador_id')
    .where('g.grupo_id', grupoId)
    .select(
      'g.id',
      'g.descripcion',
      'g.importe',
      'g.lugar',
      'g.fecha_pago',
      'g.pagador_id',
      'u.nombre as pagador_nombre',
      'u.correo as pagador_correo'
    )
    .orderBy('g.fecha_pago', 'desc');

  if (options?.fechaDesde) {
    query = query.where('g.fecha_pago', '>=', options.fechaDesde);
  }
  if (options?.fechaHasta) {
    query = query.where('g.fecha_pago', '<=', options.fechaHasta);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
    if (options?.page) {
      query = query.offset((options.page - 1) * options.limit);
    }
  }

  return query;
}

export async function getExpenseById(gastoId: string, grupoId: string) {
  const gasto = await db('dbo.gastos as g')
    .join('dbo.usuarios as u', 'u.id', 'g.pagador_id')
    .where({ 'g.id': gastoId, 'g.grupo_id': grupoId })
    .select(
      'g.id',
      'g.descripcion',
      'g.importe',
      'g.lugar',
      'g.fecha_pago',
      'g.pagador_id',
      'u.nombre as pagador_nombre',
      'u.correo as pagador_correo'
    )
    .first();

  if (!gasto) return null;

  const divisiones = await db('dbo.divisiones_gasto as d')
    .join('dbo.usuarios as u', 'u.id', 'd.usuario_id')
    .where({ 'd.gasto_id': gastoId, 'd.grupo_id': grupoId })
    .select(
      'd.usuario_id',
      'd.parte_importe',
      'd.parte_porcentaje',
      'u.nombre as usuario_nombre',
      'u.correo as usuario_correo'
    );

  return {
    ...gasto,
    participantes: divisiones.map((d) => ({
      usuarioId: d.usuario_id,
      usuarioNombre: d.usuario_nombre,
      usuarioCorreo: d.usuario_correo,
      parte_importe: d.parte_importe,
      parte_porcentaje: d.parte_porcentaje
    }))
  };
}

