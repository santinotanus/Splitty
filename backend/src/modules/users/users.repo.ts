import { db } from '../../config/db';

export async function findUserByFirebaseUid(firebase_uid: string) {
  return db('dbo.usuarios')
    .select('id', 'firebase_uid', 'nombre', 'correo', 'fechaNacimiento')
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
    .select('id', 'firebase_uid', 'nombre', 'correo', 'fechaNacimiento')
    .where({ correo })
    .first();
}