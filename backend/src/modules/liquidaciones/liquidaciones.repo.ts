import { db } from '../../config/db';
import { Knex } from 'knex';

export async function createSettlementWithLedger(
  trx: Knex.Transaction,
  grupoId: string,
  desdeUsuario: string,
  haciaUsuario: string,
  importe: number,
  fechaPago: Date
) {
  // 1. Insertar liquidación
  const liquidacionResult = await trx.raw(
    `INSERT INTO dbo.liquidaciones (id, grupo_id, desde_usuario, hacia_usuario, importe, fecha_pago)
     OUTPUT inserted.id
     VALUES (NEWID(), ?, ?, ?, ?, ?)`,
    [grupoId, desdeUsuario, haciaUsuario, importe, fechaPago]
  );

  const liquidacionId = liquidacionResult?.[0]?.[0]?.id as string | undefined;
  if (!liquidacionId) {
    throw new Error('FAILED_TO_CREATE_SETTLEMENT');
  }

  // 2. Insertar asientos en ledger
  // Desde_usuario: débito (D) porque está pagando (reduce su deuda/balance negativo)
  await trx.raw(
    `INSERT INTO dbo.ledger (id, grupo_id, usuario_id, tipo_origen, liquidacion_id, direccion, importe, fecha)
     VALUES (NEWID(), ?, ?, 'liquidacion', ?, 'D', ?, SYSUTCDATETIME())`,
    [grupoId, desdeUsuario, liquidacionId, importe]
  );

  // Hacia_usuario: crédito (C) porque está recibiendo (reduce lo que le deben/balance positivo)
  await trx.raw(
    `INSERT INTO dbo.ledger (id, grupo_id, usuario_id, tipo_origen, liquidacion_id, direccion, importe, fecha)
     VALUES (NEWID(), ?, ?, 'liquidacion', ?, 'C', ?, SYSUTCDATETIME())`,
    [grupoId, haciaUsuario, liquidacionId, importe]
  );

  return liquidacionId;
}

export async function listSettlements(grupoId: string) {
  return db('dbo.liquidaciones as l')
    .join('dbo.usuarios as u_desde', 'u_desde.id', 'l.desde_usuario')
    .join('dbo.usuarios as u_hacia', 'u_hacia.id', 'l.hacia_usuario')
    .where('l.grupo_id', grupoId)
    .select(
      'l.id',
      'l.desde_usuario',
      'l.hacia_usuario',
      'l.importe',
      'l.fecha_pago',
      'u_desde.nombre as desde_usuario_nombre',
      'u_desde.correo as desde_usuario_correo',
      'u_hacia.nombre as hacia_usuario_nombre',
      'u_hacia.correo as hacia_usuario_correo'
    )
    .orderBy('l.fecha_pago', 'desc');
}

