import { db } from '../../config/db';

export async function getUserIdByFirebaseUid(firebaseUid: string) {
  const row = await db('dbo.usuarios').select('id').where({ firebase_uid: firebaseUid }).first();
  return row?.id as string | undefined;
}

export async function areAlreadyFriends(userIdA: string, userIdB: string) {
  const [low, high] = userIdA < userIdB ? [userIdA, userIdB] : [userIdB, userIdA];
  const row = await db('dbo.amistades')
    .select('usuario_a')
    .where({ usuario_a: low, usuario_b: high })
    .first();
  return !!row;
}

export async function getSolicitudById(id: string) {
  return db('dbo.solicitudes_amistad').select('*').where({ id }).first();
}

export async function createFriendRequest(solicitanteId: string, receptorId: string) {
  const result = await db.raw(
    `INSERT INTO dbo.solicitudes_amistad (id, solicitante_id, receptor_id, estado, fecha_creacion)
     OUTPUT inserted.id
     VALUES (NEWID(), ?, ?, 'pendiente', SYSUTCDATETIME())`,
    [solicitanteId, receptorId]
  );

  if (result && result.length > 0 && result[0].id) return result[0].id as string;

  const row = await db('dbo.solicitudes_amistad')
    .select('id')
    .where({ solicitante_id: solicitanteId, receptor_id: receptorId, estado: 'pendiente' })
    .first();
  return row?.id as string | undefined;
}

export async function listPendingReceived(receptorId: string) {
  return db('dbo.solicitudes_amistad as s')
    .join('dbo.usuarios as u', 'u.id', 's.solicitante_id')
    .where({ 's.receptor_id': receptorId, 's.estado': 'pendiente' })
    .select(
      's.id as solicitudId',
      's.fecha_creacion as fecha',
      'u.id as solicitanteId',
      'u.nombre as solicitanteNombre',
      'u.correo as solicitanteCorreo'
    )
    .orderBy('s.fecha_creacion', 'desc');
}

export async function updateSolicitudEstado(id: string, estado: 'aceptada' | 'rechazada') {
  return db('dbo.solicitudes_amistad').where({ id }).update({ estado });
}

export async function insertAmistad(userIdA: string, userIdB: string) {
  const [low, high] = userIdA < userIdB ? [userIdA, userIdB] : [userIdB, userIdA];
  return db('dbo.amistades').insert({ usuario_a: low, usuario_b: high, fecha_alta: db.raw('SYSUTCDATETIME()') });
}

export async function listFriends(userId: string) {
  // Devuelve info básica del amigo
  const aSide = db('dbo.amistades as a')
    .join('dbo.usuarios as u', 'u.id', 'a.usuario_b')
    .where('a.usuario_a', userId)
    .select('u.id', 'u.firebase_uid', 'u.nombre', 'u.correo');

  const bSide = db('dbo.amistades as a')
    .join('dbo.usuarios as u', 'u.id', 'a.usuario_a')
    .where('a.usuario_b', userId)
    .select('u.id', 'u.firebase_uid', 'u.nombre', 'u.correo');

  return aSide.unionAll([bSide]).orderBy('nombre');
}


