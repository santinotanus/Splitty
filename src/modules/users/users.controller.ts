import { Request, Response } from 'express';
import { AuthRequest } from '../../middlewares/auth';
import * as svc from './users.service';

export async function getMe(req: Request, res: Response) {
  // El middleware requireAuth agrega req.user con el firebase_uid
  const firebaseUid = (req as AuthRequest).user?.uid;

  if (!firebaseUid) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }

  try {
    const me = await svc.getMe({ firebaseUid });

    if (!me) {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }

    res.json(me);
  } catch (err) {
    console.error('Error en getMe:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}

export async function updateMe(req: Request, res: Response) {
  const firebaseUid = (req as AuthRequest).user?.uid;

  if (!firebaseUid) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }

  // --- 👇 NUEVOS LOGS DE DIAGNÓSTICO ---
  console.log('--- 🛑 INICIO UPDATE ME CONTROLLER 🛑 ---');
  console.log('HEADERS (Content-Type):', req.headers['content-type']);
  console.log('BODY KEYS:', Object.keys(req.body));
  const bodyString = JSON.stringify(req.body);
  if (bodyString.length > 500) {
    console.log(`BODY (GRANDE): ${bodyString.length} bytes`);
  } else {
    console.log('BODY (COMPLETO):', bodyString);
  }
  console.log('CONTROLLER: req.body.foto_data existe?', !!req.body.foto_data);
  console.log('CONTROLLER: req.body.foto_data length:', req.body.foto_data?.length || 0);
  // --- 👆 FIN DE LOS LOGS ---

  try {
    const { nombre, clave_pago, foto_url, foto_data } = req.body;

    // Logs originales (algunos son redundantes con los nuevos, pero los dejo por si acaso)
    console.log('📝 updateMe controller - firebaseUid:', firebaseUid);
    console.log('📦 updateMe controller - has nombre:', !!nombre);
    console.log('📦 updateMe controller - has clave_pago:', !!clave_pago);
    console.log('📦 updateMe controller - has foto_url:', !!foto_url);

    if (foto_data) {
      console.log('📦 updateMe controller - foto_data preview:', foto_data.substring(0, 50) + '...');
    } else {
      console.log('📦 updateMe controller - NO HAY foto_data en el body desestructurado');
    }

    // 🔥 FIX: Capturar el usuario actualizado que devuelve el service
    const updatedUser = await svc.updateMe({
      firebaseUid,
      nombre,
      clave_pago,
      foto_url,
      foto_data
    });

    console.log('✅ updateMe controller - updatedUser:', {
      id: updatedUser?.id,
      nombre: updatedUser?.nombre,
      foto_url: updatedUser?.foto_url
    });

    // 🔥 FIX: Devolver el usuario completo en lugar de solo {ok: true}
    res.json(updatedUser);

  } catch (err) {
    console.error('Error en updateMe:', err);
    // Detectar error de constraint UNIQUE sobre clave_pago
    const message = (err as any)?.message || '';
    if (message && message.includes('UQ_Usuarios_ClavePago')) {
      return res.status(409).json({ error: 'CLAVE_PAGO_ALREADY_IN_USE' });
    }
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}

export async function findByEmail(req: Request, res: Response) {
  try {
    const { email } = req.query as any;
    if (!email) return res.status(400).json({ error: 'MISSING_EMAIL' });
    const user = await svc.findByEmail({ email: String(email) });
    if (!user) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json(user);
  } catch (e: any) {
    console.error('Error en findByEmail:', e);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}

export async function checkClaveAvailable(req: Request, res: Response) {
  try {
    const { clave } = req.query as any;
    if (!clave || typeof clave !== 'string') return res.status(400).json({ error: 'MISSING_CLAVE' });
    const available = await svc.isClaveAvailable({ clave: String(clave) });
    return res.json({ available });
  } catch (e: any) {
    console.error('Error en checkClaveAvailable:', e);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}