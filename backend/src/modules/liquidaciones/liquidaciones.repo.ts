import { Knex } from 'knex';
import { db } from '../../config/db';
import crypto from 'crypto';

export async function createSettlementWithLedger(
  trx: Knex.Transaction,
  grupoId: string,
  desdeUsuario: string,
  haciaUsuario: string,
  importe: number,
  fechaPago: Date
) {
  const liquidacionId = crypto.randomUUID();

  console.log('💾 createSettlementWithLedger args', {
    liquidacionId,
    grupoId,
    desdeUsuario,
    haciaUsuario,
    importe,
    fechaPago,
  });

  await trx.raw(
    `INSERT INTO dbo.liquidaciones (id, grupo_id, desde_usuario, hacia_usuario, importe, fecha_pago)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [liquidacionId, grupoId, desdeUsuario, haciaUsuario, importe, fechaPago]
  );

  await trx.raw(
    `INSERT INTO dbo.ledger (id, grupo_id, usuario_id, tipo_origen, liquidacion_id, direccion, importe, fecha)
     VALUES (NEWID(), ?, ?, 'liquidacion', ?, 'D', ?, SYSUTCDATETIME())`,
    [grupoId, desdeUsuario, liquidacionId, importe]
  );

  await trx.raw(
    `INSERT INTO dbo.ledger (id, grupo_id, usuario_id, tipo_origen, liquidacion_id, direccion, importe, fecha)
     VALUES (NEWID(), ?, ?, 'liquidacion', ?, 'C', ?, SYSUTCDATETIME())`,
    [grupoId, haciaUsuario, liquidacionId, importe]
  );

  console.log('✅ Liquidación creada con id', liquidacionId);
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

