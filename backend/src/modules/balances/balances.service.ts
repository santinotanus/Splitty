import * as repo from './balances.repo';
import * as commonRepo from '../../repositories/common.repo';
// cloudinary types may not be present in dev environment; ignore TypeScript module resolution here
// @ts-ignore
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary using environment variables (see backend/.env)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// NOTE: We use Cloudinary here to store comprobantes (images). The
// project previously tried Firebase Storage, but Spark plan prevents
// server-side uploads and signed URLs. Cloudinary is configured via
// environment variables. If you need unsigned uploads from the client,
// use an upload preset and send directly from the client. For now we
// do server-side upload (safer) using the API key/secret from .env.

export async function obtenerMiBalance({
  firebaseUid,
  grupoId
}: {
  firebaseUid: string;
  grupoId: string;
}) {
  const userId = await commonRepo.getUserIdByFirebaseUid(firebaseUid);
  if (!userId) {
    const err = new Error('USER_NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }

  const grupo = await commonRepo.findGroupById(grupoId);
  if (!grupo) {
    const err = new Error('GROUP_NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }

  const esMiembro = await commonRepo.isMember(grupoId, userId);
  if (!esMiembro) {
    const err = new Error('FORBIDDEN');
    (err as any).status = 403;
    throw err;
  }

  const balance = await repo.getMyBalance(grupoId, userId);
  return { balance };
}

export async function obtenerMisDeudas({
  firebaseUid,
  grupoId
}: {
  firebaseUid: string;
  grupoId: string;
}) {
  const userId = await commonRepo.getUserIdByFirebaseUid(firebaseUid);
  if (!userId) {
    const err = new Error('USER_NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }

  const grupo = await commonRepo.findGroupById(grupoId);
  if (!grupo) {
    const err = new Error('GROUP_NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }

  const esMiembro = await commonRepo.isMember(grupoId, userId);
  if (!esMiembro) {
    const err = new Error('FORBIDDEN');
    (err as any).status = 403;
    throw err;
  }

  return await repo.getMyDebts(grupoId, userId);
}

export async function obtenerMisCreditos({
  firebaseUid,
  grupoId
}: {
  firebaseUid: string;
  grupoId: string;
}) {
  const userId = await commonRepo.getUserIdByFirebaseUid(firebaseUid);
  if (!userId) {
    const err = new Error('USER_NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }

  const grupo = await commonRepo.findGroupById(grupoId);
  if (!grupo) {
    const err = new Error('GROUP_NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }

  const esMiembro = await commonRepo.isMember(grupoId, userId);
  if (!esMiembro) {
    const err = new Error('FORBIDDEN');
    (err as any).status = 403;
    throw err;
  }

  return await repo.getMyCredits(grupoId, userId);
}

export async function obtenerResumen({
  firebaseUid,
  grupoId
}: {
  firebaseUid: string;
  grupoId: string;
}) {
  const userId = await commonRepo.getUserIdByFirebaseUid(firebaseUid);
  if (!userId) {
    const err = new Error('USER_NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }

  const grupo = await commonRepo.findGroupById(grupoId);
  if (!grupo) {
    const err = new Error('GROUP_NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }

  const esMiembro = await commonRepo.isMember(grupoId, userId);
  if (!esMiembro) {
    const err = new Error('FORBIDDEN');
    (err as any).status = 403;
    throw err;
  }

  return await repo.getGroupSummary(grupoId);
}

export async function subirComprobante({
  firebaseUid,
  grupoId,
  deudorId,
  acreedorId,
  filename,
  data,
  url
}: {
  firebaseUid: string;
  grupoId: string;
  deudorId: string;
  acreedorId: string;
  filename?: string;
  data?: string; // base64
  url?: string; // client-provided (unsigned upload)
}) {
  const userId = await commonRepo.getUserIdByFirebaseUid(firebaseUid);
  if (!userId) {
    const err = new Error('USER_NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }

  const grupo = await commonRepo.findGroupById(grupoId);
  if (!grupo) {
    const err = new Error('GROUP_NOT_FOUND');
    (err as any).status = 404;
    throw err;
  }

  const esMiembro = await commonRepo.isMember(grupoId, userId);
  if (!esMiembro) {
    const err = new Error('FORBIDDEN');
    (err as any).status = 403;
    throw err;
  }

  // ===== CLOUDINARY UPLOAD =====

  // If the client already uploaded the image to Cloudinary (unsigned)
  // it will send us `url` in the body. In that case we simply validate
  // and persist the URL (no server-side upload). Otherwise we expect
  // `data` (base64) and perform a server-side upload using our API
  // credentials as a fallback.
  if (url && typeof url === 'string' && url.startsWith('http')) {
    // Basic validation: allow http(s) URLs only
    try {
      const saved = await repo.insertReceipt({
        grupoId,
        deudorId,
        acreedorId,
        url,
        uploadedBy: userId
      });

      return { ok: true, url, id: saved?.id };
    } catch (dbErr: any) {
      console.error('Error inserting receipt metadata into DB (client-provided URL):', dbErr?.message || dbErr);
      const err = new Error('DB_INSERT_ERROR: ' + (dbErr?.message || 'unknown'));
      (err as any).status = 500;
      throw err;
    }
  }

  // Server-side upload to Cloudinary using API key/secret from .env
  if (!data || typeof data !== 'string' || data.length < 20) {
    const err = new Error('INVALID_IMAGE_DATA');
    (err as any).status = 400;
    throw err;
  }

  const safeName = (filename || 'receipt.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
  const ext = (safeName.split('.').pop() || '').toLowerCase();
  const allowed = ['jpg', 'jpeg', 'png'];
  if (!allowed.includes(ext)) {
    const err = new Error('UNSUPPORTED_FILE_TYPE');
    (err as any).status = 400;
    throw err;
  }

  // Build / normalize data URI for Cloudinary upload
  // If the client already included the data URI prefix, accept it as-is.
  let dataUri = data;
  if (!dataUri.startsWith('data:')) {
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
    dataUri = `data:${mime};base64,${data}`;
  }

  try {
    // Validate Cloudinary credentials before attempting upload
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error('Cloudinary not configured. Missing CLOUDINARY_CLOUD_NAME/API_KEY/SECRET');
      const err = new Error('CLOUDINARY_NOT_CONFIGURED');
      (err as any).status = 500;
      throw err;
    }

    const uploadOptions: any = {
      folder: process.env.CLOUDINARY_FOLDER || 'comprobantes',
      resource_type: 'image',
      // Avoid storing huge originals: apply a limit + quality/compression
      transformation: [
        { width: 1600, crop: 'limit', fetch_format: 'auto' },
        { quality: '60' }
      ]
    };

    // public_id: include group and a timestamp to avoid collisions
    const publicIdBase = `${grupoId}/${Date.now()}_${Math.random().toString(36).slice(2)}_${safeName.replace(/\.[^.]+$/, '')}`;
    uploadOptions.public_id = publicIdBase;

    const result = await cloudinary.uploader.upload(dataUri, uploadOptions);
    const secureUrl = result.secure_url || result.url;
    console.log('☁️ Cloudinary upload result:', { public_id: result.public_id, secure_url: secureUrl });

    // Persist metadata in DB
    const saved = await repo.insertReceipt({
      grupoId,
      deudorId,
      acreedorId,
      url: secureUrl,
      uploadedBy: userId
    });

    console.log('📝 insertReceipt returned id:', saved?.id);

    return { ok: true, url: secureUrl, id: saved?.id };
  } catch (err: any) {
    console.error('Cloudinary upload failed:', err?.message || err);
    const error = new Error('UPLOAD_FAILED: ' + (err?.message || 'unknown'));
    (error as any).status = 500;
    throw error;
  }
  // ===== END CLOUDINARY UPLOAD =====
}

