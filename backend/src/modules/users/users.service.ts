import * as repo from './users.repo';

export function getMe({ firebaseUid }: { firebaseUid: string }) {
  return repo.findUserByFirebaseUid(firebaseUid);
}

export function updateMe({ firebaseUid, nombre, clave_pago }: { firebaseUid: string; nombre?: string; clave_pago?: string | null }) {
  return repo.updateUser(firebaseUid, { nombre, clave_pago });
}

export async function findByEmail({ email }: { email: string }) {
  // Normalizar email
  const correo = (email || '').trim().toLowerCase();
  if (!correo) return null;
  return repo.findUserByEmail(correo);
}

export async function isClaveAvailable({ clave }: { clave: string }) {
  const user = await repo.findUserByClavePago(clave);
  return !user;
}