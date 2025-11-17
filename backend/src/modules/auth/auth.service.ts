import * as repo from './auth.repo';
// @ts-ignore
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export async function syncUser(input: {
  firebaseUid: string;
  email: string;
  nombre: string;
  fechaNacimiento: string;
  clave_pago?: string | null;
  foto_data?: string | null; // base64 data
  foto_url?: string | null; // client-provided cloudinary url
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

  // Handle optional profile photo: either client provided foto_url
  // or server-side upload of foto_data (base64)
  let finalFotoUrl: string | null = null;

  if (input.foto_url && typeof input.foto_url === 'string') {
    finalFotoUrl = input.foto_url;
  } else if (input.foto_data && typeof input.foto_data === 'string' && input.foto_data.length > 20) {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      const err = new Error('CLOUDINARY_NOT_CONFIGURED');
      (err as any).status = 500;
      throw err;
    }

    // Normalize to data URI if needed (assume jpeg if unknown)
    let dataUri = input.foto_data;
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

      const publicIdBase = `${input.firebaseUid}/${Date.now()}_${Math.random().toString(36).slice(2)}`;
      uploadOptions.public_id = publicIdBase;

      const result = await cloudinary.uploader.upload(dataUri, uploadOptions);
      finalFotoUrl = result.secure_url || result.url || null;
      console.log('☁️ Cloudinary upload result for syncUser:', {
        public_id: result.public_id,
        secure_url: result.secure_url,
        url: result.url
      });
    } catch (uploadErr: any) {
      console.error('Cloudinary upload failed for user foto:', uploadErr?.message || uploadErr);
      const err = new Error('UPLOAD_FAILED');
      (err as any).status = 500;
      throw err;
    }
  }

  console.log('📝 syncUser finalFotoUrl:', finalFotoUrl);

  console.log('📝 Insertando nuevo usuario en DB...');
  const id = await repo.insertUser({
    firebase_uid: input.firebaseUid,
    nombre: input.nombre,
    correo: input.email,
    fechaNacimiento: fechaNacimientoDate,
    clave_pago: input.clave_pago ?? null,
    foto_url: finalFotoUrl
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