import * as repo from './users.repo';

export function getMe({ firebaseUid }: { firebaseUid: string }) {
  return repo.findUserByFirebaseUid(firebaseUid);
}

export function updateMe({ firebaseUid, nombre }: { firebaseUid: string; nombre: string }) {
  return repo.updateUserName(firebaseUid, nombre);
}

export async function findByEmail({ email }: { email: string }) {
  // Normalizar email
  const correo = (email || '').trim().toLowerCase();
  if (!correo) return null;
  return repo.findUserByEmail(correo);
}