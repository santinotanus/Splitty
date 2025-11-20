import * as repo from './users.repo';
// @ts-ignore
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export function getMe({ firebaseUid }: { firebaseUid: string }) {
  return repo.findUserByFirebaseUid(firebaseUid);
}

export async function updateMe({
  firebaseUid,
  nombre,
  clave_pago,
  foto_url,
  foto_data
}: {
  firebaseUid: string;
  nombre?: string;
  clave_pago?: string | null;
  foto_url?: string | null;
  foto_data?: string | null
}) {
  let finalFotoUrl = foto_url ?? null;

  console.log('🔑 updateMe called with firebaseUid:', firebaseUid);

  // Si viene foto_data (base64), subir a Cloudinary
  if (!finalFotoUrl && foto_data && typeof foto_data === 'string' && foto_data.length > 20) {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      const err = new Error('CLOUDINARY_NOT_CONFIGURED');
      (err as any).status = 500;
      throw err;
    }

    let dataUri = foto_data;
    if (!dataUri.startsWith('data:')) {
      dataUri = `data:image/jpeg;base64,${dataUri}`;
    }

    try {
      const uploadOptions: any = {
        folder: process.env.CLOUDINARY_FOLDER || 'usuarios',
        resource_type: 'image',
        transformation: [
          { width: 1600, crop: 'limit', fetch_format: 'auto' },
          { quality: '60' }
        ]
      };
      const publicIdBase = `${firebaseUid}/${Date.now()}_${Math.random().toString(36).slice(2)}`;
      uploadOptions.public_id = publicIdBase;

      const result = await cloudinary.uploader.upload(dataUri, uploadOptions);
      finalFotoUrl = result.secure_url || result.url || null;
      console.log('☁️ Cloudinary upload result for updateMe:', {
        public_id: result.public_id,
        secure_url: result.secure_url,
        url: result.url
      });
    } catch (uploadErr: any) {
      console.error('Cloudinary upload failed for user foto in updateMe:', uploadErr?.message || uploadErr);
      const err = new Error('UPLOAD_FAILED');
      (err as any).status = 500;
      throw err;
    }
  }

  const updatePayload: { nombre?: string; clave_pago?: string | null; foto_url?: string | null } = {};

  // Solo incluir campos que realmente queremos actualizar
  if (nombre !== undefined) updatePayload.nombre = nombre;
  if (clave_pago !== undefined) updatePayload.clave_pago = clave_pago;
  if (finalFotoUrl !== null || foto_data !== undefined || foto_url !== undefined) {
    updatePayload.foto_url = finalFotoUrl;
  }

  console.log('📝 updateMe service - payload:', updatePayload);
  console.log('📝 updateMe service - foto_url in payload:', updatePayload.foto_url);

  await repo.updateUser(firebaseUid, updatePayload);
  console.log('✅ updateMe service - DB update completed');

  // 🔥 FIX: Devolver el usuario actualizado con la nueva URL
  const updatedUser = await repo.findUserByFirebaseUid(firebaseUid);
  console.log('📤 updateMe service - returning user:', {
    id: updatedUser?.id,
    nombre: updatedUser?.nombre,
    foto_url: updatedUser?.foto_url
  });

  if (!updatedUser) {
    const err = new Error('USER_NOT_FOUND_AFTER_UPDATE');
    (err as any).status = 500;
    throw err;
  }

  return updatedUser;
}

export async function findByEmail({ email }: { email: string }) {
  const correo = (email || '').trim().toLowerCase();
  if (!correo) return null;
  return repo.findUserByEmail(correo);
}

export async function isClaveAvailable({ clave }: { clave: string }) {
  const user = await repo.findUserByClavePago(clave);
  return !user;
}
