import { db } from '../../config/db';

export async function findUserByFirebaseUid(firebaseUid: string) {
  return db('dbo.usuarios')
    .select('id', 'firebase_uid', 'nombre', 'correo', 'fechaNacimiento', 'clave_pago')
    .where({ firebase_uid: firebaseUid })
    .first();
}

export async function findUserByEmail(correo: string) {
  return db('dbo.usuarios')
    .select('id', 'firebase_uid', 'nombre', 'correo', 'clave_pago')
    .where({ correo })
    .first();
}

export async function insertUser(params: {
  firebase_uid: string;
  nombre: string;
  correo: string;
  fechaNacimiento: Date;
  clave_pago?: string | null;
}) {
  const { firebase_uid, nombre, correo, fechaNacimiento, clave_pago } = params;

  // 🔥 SQL Server with UNIQUEIDENTIFIER - include clave_pago (nullable)
  const result = await db.raw(`
    INSERT INTO dbo.usuarios (id, firebase_uid, nombre, correo, fechaNacimiento, clave_pago, fecha_creacion)
    OUTPUT inserted.id
    VALUES (NEWID(), ?, ?, ?, ?, ?, GETDATE())
  `, [firebase_uid, nombre, correo, fechaNacimiento, clave_pago ?? null]);

  // Different drivers may return different shapes
  let insertedId: any = undefined;
  try { insertedId = result?.recordset?.[0]?.id || result?.[0]?.[0]?.id || result?.[0]?.id; } catch (e) { insertedId = undefined; }
  if (insertedId) return insertedId;

  const row = await db('dbo.usuarios')
    .select('id')
    .where({ firebase_uid })
    .first();

  return row?.id;
}

export async function findUserByClavePago(clave: string) {
  return db('dbo.usuarios')
    .select('id', 'firebase_uid', 'nombre', 'correo', 'clave_pago')
    .where({ clave_pago: clave })
    .first();
}

export async function updateUserName(firebase_uid: string, nombre: string) {
  return db('dbo.usuarios')
    .where({ firebase_uid })
    .update({ nombre });
}