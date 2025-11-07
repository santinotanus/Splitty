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

  try {
    const { nombre } = req.body;
    await svc.updateMe({ firebaseUid, nombre });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error en updateMe:', err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}