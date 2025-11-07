import { db } from '../../config/db';

export async function getUserIdByFirebaseUid(firebaseUid: string) {
  const row = await db('dbo.usuarios').select('id').where({ firebase_uid: firebaseUid }).first();
  return row?.id as string | undefined;
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

export async function isMember(grupoId: string, usuarioId: string) {
  const row = await db('dbo.miembros_grupo').select('grupo_id').where({ grupo_id: grupoId, usuario_id: usuarioId }).first();
  return !!row;
}

export async function listMembers(grupoId: string) {
  return db('dbo.miembros_grupo as m')
    .join('dbo.usuarios as u', 'u.id', 'm.usuario_id')
    .where('m.grupo_id', grupoId)
    .select('u.id', 'u.firebase_uid', 'u.nombre', 'u.correo', 'm.rol', 'm.fecha_creacion')
    .orderBy('m.fecha_creacion', 'asc');
}

export async function findGroupById(grupoId: string) {
  return db('dbo.grupos').select('id', 'nombre', 'descripcion', 'fecha_creacion').where({ id: grupoId }).first();
}

export async function getMemberRole(grupoId: string, usuarioId: string) {
  const row = await db('dbo.miembros_grupo').select('rol').where({ grupo_id: grupoId, usuario_id: usuarioId }).first();
  return row?.rol as string | undefined;
}

export async function listGroupsForUser(usuarioId: string) {
  return db('dbo.grupos as g')
    .join('dbo.miembros_grupo as m', 'm.grupo_id', 'g.id')
    .where('m.usuario_id', usuarioId)
    .select('g.id', 'g.nombre', 'g.descripcion', 'g.fecha_creacion', 'm.rol')
    .orderBy('g.fecha_creacion', 'asc');
}


