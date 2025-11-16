import { db } from '../../config/db';

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


export async function listMembers(grupoId: string) {
  return db('dbo.miembros_grupo as m')
    .join('dbo.usuarios as u', 'u.id', 'm.usuario_id')
    .where('m.grupo_id', grupoId)
    .select('u.id', 'u.firebase_uid', 'u.nombre', 'u.correo', 'm.rol', 'm.fecha_creacion')
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



