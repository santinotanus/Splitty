import * as repo from './auth.repo';

export async function syncUser(input: {
  firebaseUid: string;
  email: string;
  nombre: string;
  fechaNacimiento: string;
  clave_pago?: string | null;
}) {
  console.log('🔄 syncUser - Input:', {
    firebaseUid: input.firebaseUid,
    email: input.email,
    nombre: input.nombre,
    fechaNacimiento: input.fechaNacimiento
  });

  const existing = await repo.findUserByFirebaseUid(input.firebaseUid);

  if (existing) {
    console.log('✅ Usuario ya existe en DB:', existing.id);
    return {
      id: existing.id,
      firebase_uid: existing.firebase_uid,
      nombre: existing.nombre,
      correo: existing.correo,
      fechaNacimiento: existing.fechaNacimiento,
      alreadyExists: true
    };
  }

  const emailTaken = await repo.findUserByEmail(input.email);

  if (emailTaken && emailTaken.firebase_uid !== input.firebaseUid) {
    console.error('❌ Email ya en uso por otro usuario');
    const err = new Error('EMAIL_ALREADY_IN_USE');
    (err as any).status = 409;
    throw err;
  }

  if (input.clave_pago) {
    const existingByClave = await repo.findUserByClavePago(String(input.clave_pago));
    if (existingByClave && existingByClave.firebase_uid !== input.firebaseUid) {
      const err = new Error('CLAVE_PAGO_ALREADY_IN_USE');
      (err as any).status = 409;
      throw err;
    }
  }

  const fechaNacimientoDate = new Date(input.fechaNacimiento);

  console.log('📝 Insertando nuevo usuario en DB...');
  const id = await repo.insertUser({
    firebase_uid: input.firebaseUid,
    nombre: input.nombre,
    correo: input.email,
    fechaNacimiento: fechaNacimientoDate,
    clave_pago: input.clave_pago ?? null
  });

  console.log('✅ Usuario creado con ID:', id);

  return {
    id,
    firebase_uid: input.firebaseUid,
    nombre: input.nombre,
    correo: input.email,
    fechaNacimiento: fechaNacimientoDate,
    alreadyExists: false
  };
}