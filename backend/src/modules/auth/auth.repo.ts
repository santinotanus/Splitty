import { db } from '../../config/db';

export async function findUserByFirebaseUid(firebaseUid: string) {
  return db('dbo.usuarios')
    .select('id', 'firebase_uid', 'nombre', 'correo', 'fechaNacimiento') // ❌ Quitar correo_verificado
    .where({ firebase_uid: firebaseUid })
    .first();
}

export async function findUserByEmail(correo: string) {
  return db('dbo.usuarios')
    .select('id', 'firebase_uid', 'nombre', 'correo') // ❌ Quitar correo_verificado
    .where({ correo })
    .first();
}

export async function insertUser(params: {
  firebase_uid: string;
  nombre: string;
  correo: string;
  fechaNacimiento: Date;
}) {
  const { firebase_uid, nombre, correo, fechaNacimiento } = params;

  // 🔥 SQL Server con UNIQUEIDENTIFIER - SIN correo_verificado
  const result = await db.raw(`
    INSERT INTO dbo.usuarios (id, firebase_uid, nombre, correo, fechaNacimiento, fecha_creacion)
    OUTPUT inserted.id
    VALUES (NEWID(), ?, ?, ?, ?, GETDATE())
  `, [firebase_uid, nombre, correo, fechaNacimiento]);

  if (result && result.length > 0 && result[0].id) {
    return result[0].id;
  }

  const row = await db('dbo.usuarios')
    .select('id')
    .where({ firebase_uid })
    .first();

  return row?.id;
}

export async function updateUserName(firebase_uid: string, nombre: string) {
  return db('dbo.usuarios')
    .where({ firebase_uid })
    .update({ nombre });
}