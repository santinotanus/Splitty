import { Request, Response } from 'express';
import { AuthRequest } from '../../middlewares/auth';
import * as svc from './liquidaciones.service';

export async function crearLiquidacion(req: Request, res: Response) {
  try {
    console.log("holaaa")
    const firebaseUid = (req as AuthRequest).user?.uid;
    if (!firebaseUid) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const { groupId: grupoId } = (req as any).validated?.params || req.params;
    const { desde_usuario, hacia_usuario, importe, fecha_pago } = (req as any).validated?.body || req.body;

    const result = await svc.crearLiquidacion({
      firebaseUid,
      grupoId,
      desde_usuario,
      hacia_usuario,
      importe,
      fecha_pago
    });

    return res.status(201).json(result);
  } catch (e: any) {
    const status = e?.status || 500;
    const payload: any = { error: e?.message || 'INTERNAL_ERROR' };
    if (process.env.NODE_ENV !== 'production') payload.stack = e?.stack;
    return res.status(status).json(payload);
  }
}

export async function listarLiquidaciones(req: Request, res: Response) {
  try {
    const firebaseUid = (req as AuthRequest).user?.uid;
    if (!firebaseUid) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const { groupId: grupoId } = (req as any).validated?.params || req.params;

    const rows = await svc.listarLiquidaciones({
      firebaseUid,
      grupoId
    });

    return res.json(rows);
  } catch (e: any) {
    const status = e?.status || 500;
    return res.status(status).json({ error: e?.message || 'INTERNAL_ERROR' });
  }
}

