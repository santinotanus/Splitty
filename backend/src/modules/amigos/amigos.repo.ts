import { db } from '../../config/db';

export async function areAlreadyFriends(userIdA: string, userIdB: string) {
  // Check both ordering possibilities in case historical rows were inserted with the opposite order.
  const row = await db('dbo.amistades')
    .select('usuario_a')
    .where(function () {
      this.where({ usuario_a: userIdA, usuario_b: userIdB }).orWhere({ usuario_a: userIdB, usuario_b: userIdA });
    })
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
      'u.correo as solicitanteCorreo',
      // 🔥 FIX: Agregar foto del solicitante
      'u.foto_url as solicitanteFotoUrl'
    )
    .orderBy('s.fecha_creacion', 'desc');
}

export async function updateSolicitudEstado(id: string, estado: 'aceptada' | 'rechazada') {
  return db('dbo.solicitudes_amistad').where({ id }).update({ estado });
}

export async function insertAmistad(userIdA: string, userIdB: string) {
  // Ordenar IDs en memoria para respetar la restricción CK_amistades_orden
  const [low, high] = userIdA < userIdB ? [userIdA, userIdB] : [userIdB, userIdA];

  // Comprobar que no existan ya como amigos
  const exists = await areAlreadyFriends(low, high);
  if (exists) {
    return null; // ya existe, nada que insertar
  }

  // Insertar (Knex) y devolver resultado; usar SYSUTCDATETIME() para la fecha
  try {
      // Try SQL insertion using server-side ordering of UNIQUEIDENTIFIERs to match CK constraint
      const rawRes = await db.raw(
        `INSERT INTO dbo.amistades (usuario_a, usuario_b, fecha_alta)
         SELECT
           CASE WHEN CAST(? AS UNIQUEIDENTIFIER) < CAST(? AS UNIQUEIDENTIFIER) THEN CAST(? AS UNIQUEIDENTIFIER) ELSE CAST(? AS UNIQUEIDENTIFIER) END,
           CASE WHEN CAST(? AS UNIQUEIDENTIFIER) < CAST(? AS UNIQUEIDENTIFIER) THEN CAST(? AS UNIQUEIDENTIFIER) ELSE CAST(? AS UNIQUEIDENTIFIER) END,
           SYSUTCDATETIME()
         WHERE NOT EXISTS (
           SELECT 1 FROM dbo.amistades
           WHERE (usuario_a = CAST(? AS UNIQUEIDENTIFIER) AND usuario_b = CAST(? AS UNIQUEIDENTIFIER))
              OR (usuario_a = CAST(? AS UNIQUEIDENTIFIER) AND usuario_b = CAST(? AS UNIQUEIDENTIFIER))
         )`,
        [
          userIdA, userIdB, userIdA, userIdB,
          userIdA, userIdB, userIdB, userIdA,
          userIdA, userIdB, userIdB, userIdA
        ]
      );
      return rawRes;
  } catch (e: any) {
    // Re-throw para que el servicio lo maneje (por ejemplo errores de constraint)
    throw e;
  }
}

export async function listFriends(userId: string) {
  // Devuelve info básica del amigo
  const aSide = db('dbo.amistades as a')
    .join('dbo.usuarios as u', 'u.id', 'a.usuario_b')
    .where('a.usuario_a', userId)
    // 🔥 FIX: Agregar foto_url al select
    .select('u.id', 'u.firebase_uid', 'u.nombre', 'u.correo', 'u.foto_url');

  const bSide = db('dbo.amistades as a')
    .join('dbo.usuarios as u', 'u.id', 'a.usuario_a')
    .where('a.usuario_b', userId)
    // 🔥 FIX: Agregar foto_url al select
    .select('u.id', 'u.firebase_uid', 'u.nombre', 'u.correo', 'u.foto_url');

  return aSide.unionAll([bSide]).orderBy('nombre');
}

export async function deleteFriendship(userIdA: string, userIdB: string) {
  return db('dbo.amistades')
    .where(function () {
      this.where({ usuario_a: userIdA, usuario_b: userIdB })
          .orWhere({ usuario_a: userIdB, usuario_b: userIdA });
    })
    .delete();
}