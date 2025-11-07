import { Request, Response } from 'express';
import { AuthRequest } from '../../middlewares/auth';
import * as svc from './amigos.service';

export async function enviarSolicitud(req: Request, res: Response) {
  try {
    const firebaseUid = (req as AuthRequest).user?.uid;
    if (!firebaseUid) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const { receptorId } = req.body as { receptorId: string };
    const result = await svc.enviarSolicitud({ firebaseUid, receptorId });
    return res.status(201).json(result);
  } catch (e: any) {
    const status = e?.status || 500;
    const payload: any = { error: e?.message || 'INTERNAL_ERROR' };
    if (process.env.NODE_ENV !== 'production') payload.stack = e?.stack;
    return res.status(status).json(payload);
  }
}

export async function listarPendientesRecibidas(_req: Request, res: Response) {
  try {
    const firebaseUid = ( _req as AuthRequest).user?.uid;
    if (!firebaseUid) return res.status(401).json({ error: 'UNAUTHORIZED' });
    const rows = await svc.listarPendientesRecibidas({ firebaseUid });
    return res.json(rows);
  } catch (e: any) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: e?.message });
  }
}

export async function aceptarSolicitud(req: Request, res: Response) {
  try {
    const firebaseUid = (req as AuthRequest).user?.uid;
    if (!firebaseUid) return res.status(401).json({ error: 'UNAUTHORIZED' });
    const { solicitudId } = (req as any).validated?.params || req.params;
    const result = await svc.aceptarSolicitud({ firebaseUid, solicitudId });
    return res.json(result);
  } catch (e: any) {
    const status = e?.status || 500;
    return res.status(status).json({ error: e?.message || 'INTERNAL_ERROR' });
  }
}

export async function rechazarSolicitud(req: Request, res: Response) {
  try {
    const firebaseUid = (req as AuthRequest).user?.uid;
    if (!firebaseUid) return res.status(401).json({ error: 'UNAUTHORIZED' });
    const { solicitudId } = (req as any).validated?.params || req.params;
    const result = await svc.rechazarSolicitud({ firebaseUid, solicitudId });
    return res.json(result);
  } catch (e: any) {
    const status = e?.status || 500;
    return res.status(status).json({ error: e?.message || 'INTERNAL_ERROR' });
  }
}

export async function listarAmigos(req: Request, res: Response) {
  try {
    const firebaseUid = (req as AuthRequest).user?.uid;
    if (!firebaseUid) return res.status(401).json({ error: 'UNAUTHORIZED' });
    const rows = await svc.listarAmigos({ firebaseUid });
    return res.json(rows);
  } catch (e: any) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: e?.message });
  }
}


