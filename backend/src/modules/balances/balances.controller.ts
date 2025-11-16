import { Request, Response } from 'express';
import { AuthRequest } from '../../middlewares/auth';
import * as svc from './balances.service';

export async function obtenerMiBalance(req: Request, res: Response) {
  try {
    const firebaseUid = (req as AuthRequest).user?.uid;
    if (!firebaseUid) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const { groupId: grupoId } = (req as any).validated?.params || req.params;

    const result = await svc.obtenerMiBalance({
      firebaseUid,
      grupoId
    });

    return res.json(result);
  } catch (e: any) {
    const status = e?.status || 500;
    return res.status(status).json({ error: e?.message || 'INTERNAL_ERROR' });
  }
}

export async function obtenerMisDeudas(req: Request, res: Response) {
  try {
    const firebaseUid = (req as AuthRequest).user?.uid;
    if (!firebaseUid) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const { groupId: grupoId } = (req as any).validated?.params || req.params;

    const result = await svc.obtenerMisDeudas({
      firebaseUid,
      grupoId
    });

    return res.json(result);
  } catch (e: any) {
    const status = e?.status || 500;
    return res.status(status).json({ error: e?.message || 'INTERNAL_ERROR' });
  }
}

export async function obtenerMisCreditos(req: Request, res: Response) {
  try {
    const firebaseUid = (req as AuthRequest).user?.uid;
    if (!firebaseUid) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const { groupId: grupoId } = (req as any).validated?.params || req.params;

    const result = await svc.obtenerMisCreditos({
      firebaseUid,
      grupoId
    });

    return res.json(result);
  } catch (e: any) {
    const status = e?.status || 500;
    return res.status(status).json({ error: e?.message || 'INTERNAL_ERROR' });
  }
}

export async function obtenerResumen(req: Request, res: Response) {
  try {
    const firebaseUid = (req as AuthRequest).user?.uid;
    if (!firebaseUid) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const { groupId: grupoId } = (req as any).validated?.params || req.params;

    const result = await svc.obtenerResumen({
      firebaseUid,
      grupoId
    });

    return res.json(result);
  } catch (e: any) {
    const status = e?.status || 500;
    return res.status(status).json({ error: e?.message || 'INTERNAL_ERROR' });
  }
}

