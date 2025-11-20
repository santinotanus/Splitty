import { Request, Response } from 'express';
import { AuthRequest } from '../../middlewares/auth';
import * as svc from './auth.service';

export async function syncUser(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const firebaseUid = authReq.user?.uid;
    const email = authReq.user?.email;

    // Avoid logging large base64 bodies raw; log presence and sizes instead
    const bodySummary: any = { nombre: req.body.nombre, fechaNacimiento: req.body.fechaNacimiento, clave_pago: req.body.clave_pago };
    if (req.body.foto_url) bodySummary.foto_url = true;
    if (req.body.foto_data) bodySummary.foto_data_length = String((req.body.foto_data || '').length).slice(0, 8) + '...';
    console.log('📥 syncUser request:', { firebaseUid, email, bodySummary });

    if (!firebaseUid || !email) {
      console.error('❌ No firebaseUid o email en request');
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }

    const { nombre, fechaNacimiento, clave_pago, foto_data, foto_url } = req.body;

    if (!nombre || !fechaNacimiento) {
      return res.status(400).json({
        error: 'MISSING_FIELDS',
        message: 'Nombre y fechaNacimiento son requeridos'
      });
    }

    const result = await svc.syncUser({
      firebaseUid,
      email,
      nombre,
      fechaNacimiento,
      clave_pago,
      foto_data,
      foto_url
    });

    console.log('✅ syncUser exitoso:', result.id);

    return res.status(result.alreadyExists ? 200 : 201).json(result);
  } catch (e: any) {
    console.error('❌ auth.syncUser error:', e);

    if (e.status) {
      return res.status(e.status).json({ error: e.message });
    }

    if (process.env.NODE_ENV !== 'production') {
      return res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: String(e?.message || e),
        stack: e?.stack
      });
    }

    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}