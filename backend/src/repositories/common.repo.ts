import { db } from '../config/db';

/**
 * Obtiene el ID de usuario basado en el Firebase UID
 */
export async function getUserIdByFirebaseUid(firebaseUid: string): Promise<string | undefined> {
  const row = await db('dbo.usuarios')
    .select('id')
    .where({ firebase_uid: firebaseUid })
    .first();
  return row?.id as string | undefined;
}

/**
 * Verifica si un usuario es miembro de un grupo
 */
export async function isMember(grupoId: string, usuarioId: string): Promise<boolean> {
  const row = await db('dbo.miembros_grupo')
    .select('grupo_id')
    .where({ grupo_id: grupoId, usuario_id: usuarioId })
    .first();
  return !!row;
}

/**
 * Busca un grupo por su ID
 */
export async function findGroupById(grupoId: string) {
  return db('dbo.grupos')
    .select('id', 'nombre', 'descripcion', 'fecha_creacion')
    .where({ id: grupoId })
    .first();
}

