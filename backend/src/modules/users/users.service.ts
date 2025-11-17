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

export async function updateMe({ firebaseUid, nombre, clave_pago, foto_url, foto_data }: { firebaseUid: string; nombre?: string; clave_pago?: string | null; foto_url?: string | null; foto_data?: string | null }) {
  let finalFotoUrl = foto_url ?? null;

  console.log('🔑 updateMe called with firebaseUid:', firebaseUid);
  try {
    const existing = await repo.findUserByFirebaseUid(firebaseUid);
    console.log('🔎 existing user before update:', { id: existing?.id, firebase_uid: existing?.firebase_uid, foto_url: existing?.foto_url });
  } catch (e) {
    console.warn('⚠️ Could not fetch existing user before update:', e?.message || e);
  }

  // If client sent foto_data (base64), perform server-side upload to Cloudinary
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

  const updatePayload = { nombre, clave_pago, foto_url: finalFotoUrl };
  console.log('📝 updateMe payload:', updatePayload);
  const rows = await repo.updateUser(firebaseUid, updatePayload);
  console.log('📝 updateMe rows affected:', rows);

  try {
    const after = await repo.findUserByFirebaseUid(firebaseUid);
    console.log('✅ user after update:', { id: after?.id, firebase_uid: after?.firebase_uid, foto_url: after?.foto_url });
  } catch (e) {
    console.warn('⚠️ Could not fetch user after update:', e?.message || e);
  }

  return rows;
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