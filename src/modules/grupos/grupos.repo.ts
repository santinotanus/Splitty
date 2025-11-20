import { db } from '../../config/db';

export async function getUserBalance(grupoId: string, usuarioId: string) {
  const result = await db('dbo.saldos_grupo')
    .where({ grupo_id: grupoId, usuario_id: usuarioId })
    .select('balance')
    .first();

  // Si no tiene registro, el saldo es 0
  return result?.balance ? Number(result.balance) : 0;
}

export async function createGroup(nombre: string, descripcion?: string) {
  const result = await db.raw(
    `INSERT INTO dbo.grupos (id, nombre, descripcion, fecha_creacion)
     OUTPUT inserted.id
     VALUES (NEWID(), ?, ?, SYSUTCDATETIME())`,
    [nombre, descripcion || null]
  );
  if (result && result.length > 0 && result[0].id) return result[0].id as string;
  const row = await db('dbo.grupos').select('id').where({ nombre }).first();
  return row?.id as string | undefined;
}

export async function addMember(grupoId: string, usuarioId: string, rol: string = 'miembro') {
  return db('dbo.miembros_grupo').insert({ grupo_id: grupoId, usuario_id: usuarioId, rol, fecha_creacion: db.raw('SYSUTCDATETIME()') });
}

export async function updateGroup(grupoId: string, data: { nombre?: string; descripcion?: string }) {
  const updates: any = {};
  if (data.nombre !== undefined) updates.nombre = data.nombre;
  if (data.descripcion !== undefined) updates.descripcion = data.descripcion;

  if (Object.keys(updates).length === 0) return;

  return db('dbo.grupos')
    .where({ id: grupoId })
    .update(updates);
}

export async function removeMember(grupoId: string, usuarioId: string) {
  return db.transaction(async (trx) => {
    // 1. Eliminamos el registro de saldo (que bloqueaba el borrado)
    await trx('dbo.saldos_grupo')
      .where({ grupo_id: grupoId, usuario_id: usuarioId })
      .delete();

    // 2. Eliminamos al miembro del grupo
    await trx('dbo.miembros_grupo')
      .where({ grupo_id: grupoId, usuario_id: usuarioId })
      .delete();
  });
}

export async function updateMemberRole(grupoId: string, usuarioId: string, rol: string) {
  return db('dbo.miembros_grupo')
    .where({ grupo_id: grupoId, usuario_id: usuarioId })
    .update({ rol });
}

export async function countAdmins(grupoId: string) {
  const result = await db('dbo.miembros_grupo')
    .where({ grupo_id: grupoId, rol: 'admin' })
    .count('usuario_id as count')
    .first();

  return result?.count ? parseInt(result.count.toString()) : 0;
}

export async function countMembers(grupoId: string) {
  const result = await db('dbo.miembros_grupo')
    .where({ grupo_id: grupoId })
    .count('usuario_id as count')
    .first();

  return result?.count ? parseInt(result.count.toString()) : 0;
}

export async function deleteGroup(grupoId: string) {
  // Eliminar en orden correcto para respetar las foreign keys
  return db.transaction(async (trx) => {
    console.log(`🗑️ Iniciando eliminación del grupo ${grupoId}`);

    try {
      // PASO CRÍTICO: Deshabilitar temporalmente el trigger de inmutabilidad del ledger
      console.log('0. Deshabilitando trigger de inmutabilidad del ledger...');
      await trx.raw('DISABLE TRIGGER dbo.trg_ledger_inmutable ON dbo.ledger');
      console.log('   ✅ Trigger deshabilitado temporalmente');

      // 1. Eliminar saldos_grupo (depende de miembros_grupo)
      console.log('1. Eliminando saldos_grupo...');
      const saldosDeleted = await trx('dbo.saldos_grupo').where({ grupo_id: grupoId }).delete();
      console.log(`   ✅ ${saldosDeleted} registros eliminados de saldos_grupo`);

      // 2. Eliminar saldos_comprobantes (depende de miembros_grupo)
      console.log('2. Eliminando saldos_comprobantes...');
      const comprobantesDeleted = await trx('dbo.saldos_comprobantes').where({ grupo_id: grupoId }).delete();
      console.log(`   ✅ ${comprobantesDeleted} registros eliminados de saldos_comprobantes`);

      // 3. Eliminar ledger (ahora SÍN el trigger de inmutabilidad)
      console.log('3. Eliminando ledger (sin trigger de inmutabilidad)...');
      const ledgerDeleted = await trx('dbo.ledger').where({ grupo_id: grupoId }).delete();
      console.log(`   ✅ ${ledgerDeleted} registros eliminados de ledger`);

      // 4. Eliminar divisiones_gasto (depende de gastos y miembros_grupo)
      console.log('4. Eliminando divisiones_gasto...');
      const divisionesDeleted = await trx('dbo.divisiones_gasto').where({ grupo_id: grupoId }).delete();
      console.log(`   ✅ ${divisionesDeleted} registros eliminados de divisiones_gasto`);

      // 5. Eliminar gastos (ahora que ledger ya no los referencia)
      console.log('5. Eliminando gastos...');
      const gastosDeleted = await trx('dbo.gastos').where({ grupo_id: grupoId }).delete();
      console.log(`   ✅ ${gastosDeleted} registros eliminados de gastos`);

      // 6. Eliminar liquidaciones (ahora que ledger ya no las referencia)
      console.log('6. Eliminando liquidaciones...');
      const liquidacionesDeleted = await trx('dbo.liquidaciones').where({ grupo_id: grupoId }).delete();
      console.log(`   ✅ ${liquidacionesDeleted} registros eliminados de liquidaciones`);

      // 7. Eliminar miembros_grupo (depende de grupos)
      console.log('7. Eliminando miembros_grupo...');
      const miembrosDeleted = await trx('dbo.miembros_grupo').where({ grupo_id: grupoId }).delete();
      console.log(`   ✅ ${miembrosDeleted} registros eliminados de miembros_grupo`);

      // 8. Finalmente eliminar el grupo
      console.log('8. Eliminando grupo...');
      const result = await trx('dbo.grupos').where({ id: grupoId }).delete();
      console.log(`   ✅ ${result} grupo eliminado`);

      // 9. Rehabilitar el trigger de inmutabilidad del ledger
      console.log('9. Rehabilitando trigger de inmutabilidad del ledger...');
      await trx.raw('ENABLE TRIGGER dbo.trg_ledger_inmutable ON dbo.ledger');
      console.log('   ✅ Trigger rehabilitado');

      console.log(`✅ Grupo ${grupoId} eliminado exitosamente`);
      return result;

    } catch (error) {
      console.error(`❌ Error eliminando grupo ${grupoId}:`, error);
      
      // IMPORTANTE: Rehabilitar el trigger incluso si hubo error
      try {
        console.log('🔧 Rehabilitando trigger tras error...');
        await trx.raw('ENABLE TRIGGER dbo.trg_ledger_inmutable ON dbo.ledger');
        console.log('   ✅ Trigger rehabilitado tras error');
      } catch (enableError) {
        console.error('❌ Error rehabilitando trigger:', enableError);
      }
      
      throw error;
    }
  });
}

export async function listMembers(grupoId: string) {
  return db('dbo.miembros_grupo as m')
    .join('dbo.usuarios as u', 'u.id', 'm.usuario_id')
    .where('m.grupo_id', grupoId)
    .select('u.id', 'u.firebase_uid', 'u.nombre', 'u.correo', 'm.rol', 'm.fecha_creacion', 'u.foto_url')
    .orderBy('m.fecha_creacion', 'asc');
}


export async function getMemberRole(grupoId: string, usuarioId: string) {
  const row = await db('dbo.miembros_grupo').select('rol').where({ grupo_id: grupoId, usuario_id: usuarioId }).first();
  return row?.rol as string | undefined;
}

export async function listGroupsForUser(usuarioId: string) {
    return db('dbo.grupos as g')
        .join('dbo.miembros_grupo as m', 'm.grupo_id', 'g.id')           // el vínculo del usuario actual
        .where('m.usuario_id', usuarioId)
        .leftJoin('dbo.miembros_grupo as allm', 'allm.grupo_id', 'g.id') // todos los miembros del grupo
        .groupBy('g.id', 'g.nombre', 'g.descripcion', 'g.fecha_creacion', 'm.rol')
        .select(
            'g.id',
            'g.nombre',
            'g.descripcion',
            'g.fecha_creacion',
            'm.rol',
            db.raw('COUNT(allm.usuario_id) as miembrosCount')
        )
        .orderBy('g.fecha_creacion', 'asc');
}

export async function listBalances(grupoId: string) {
  return db('dbo.ledger as l')
    .join('dbo.usuarios as u', 'u.id', 'l.usuario_id')
    .where('l.grupo_id', grupoId)
    .groupBy('l.usuario_id', 'u.id', 'u.nombre', 'u.correo')
    .select('u.id as usuarioId', 'u.nombre as usuarioNombre', 'u.correo as usuarioCorreo', db.raw("SUM(CASE WHEN l.direccion = 'C' THEN l.importe ELSE -l.importe END) as balance"))
    .orderBy('u.nombre');
}
