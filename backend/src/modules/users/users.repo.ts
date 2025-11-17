import { db } from '../../config/db';

export async function findUserByFirebaseUid(firebase_uid: string) {
  return db('dbo.usuarios')
    .select('id', 'firebase_uid', 'nombre', 'correo', 'fechaNacimiento', 'clave_pago', 'foto_url')
    .where({ firebase_uid })
    .first();
}

export async function updateUserName(firebase_uid: string, nombre: string) {
  return db('dbo.usuarios')
    .where({ firebase_uid })
    .update({ nombre });
}

export async function findUserByEmail(correo: string) {
  return db('dbo.usuarios')
    .select('id', 'firebase_uid', 'nombre', 'correo', 'fechaNacimiento', 'clave_pago', 'foto_url')
    .where({ correo })
    .first();
}

export async function findUserByClavePago(clave: string) {
  return db('dbo.usuarios')
    .select('id', 'firebase_uid', 'nombre', 'correo', 'fechaNacimiento', 'clave_pago', 'foto_url')
    .where({ clave_pago: clave })
    .first();
}

export async function updateUser(firebase_uid: string, updates: { nombre?: string; clave_pago?: string | null; foto_url?: string | null }) {
  const payload: any = {};
  if (updates.nombre !== undefined) payload.nombre = updates.nombre;
  if (updates.clave_pago !== undefined) payload.clave_pago = updates.clave_pago;
  if (updates.foto_url !== undefined) payload.foto_url = updates.foto_url;
  return db('dbo.usuarios')
    .where({ firebase_uid })
    .update(payload);
}