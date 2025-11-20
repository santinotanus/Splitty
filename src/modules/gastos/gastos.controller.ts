import { Request, Response } from 'express';
import { AuthRequest } from '../../middlewares/auth';
import * as svc from './gastos.service';

export async function crearGasto(req: Request, res: Response) {
  try {
    const firebaseUid = (req as AuthRequest).user?.uid;
    if (!firebaseUid) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const { groupId: grupoId } = (req as any).validated?.params || req.params;
    const { pagadorId, descripcion, importe, lugar, fecha_pago, participantes } = (req as any).validated?.body || req.body;

    const result = await svc.crearGasto({
      firebaseUid,
      grupoId,
      pagadorId,
      descripcion,
      importe,
      lugar,
      fecha_pago,
      participantes
    });

    return res.status(201).json(result);
  } catch (e: any) {
    const status = e?.status || 500;
    const payload: any = { error: e?.message || 'INTERNAL_ERROR' };
    if (process.env.NODE_ENV !== 'production') payload.stack = e?.stack;
    return res.status(status).json(payload);
  }
}

export async function listarGastos(req: Request, res: Response) {
  try {
    const firebaseUid = (req as AuthRequest).user?.uid;
    if (!firebaseUid) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const { groupId: grupoId } = (req as any).validated?.params || req.params;
    const { page, limit, fechaDesde, fechaHasta } = (req as any).validated?.query || req.query;

    const rows = await svc.listarGastos({
      firebaseUid,
      grupoId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      fechaDesde: fechaDesde as string | undefined,
      fechaHasta: fechaHasta as string | undefined
    });

    return res.json(rows);
  } catch (e: any) {
    const status = e?.status || 500;
    return res.status(status).json({ error: e?.message || 'INTERNAL_ERROR' });
  }
}

export async function obtenerGasto(req: Request, res: Response) {
  try {
    const firebaseUid = (req as AuthRequest).user?.uid;
    if (!firebaseUid) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const { groupId: grupoId, expenseId } = (req as any).validated?.params || req.params;

    const gasto = await svc.obtenerGasto({
      firebaseUid,
      grupoId,
      expenseId
    });

    return res.json(gasto);
  } catch (e: any) {
    const status = e?.status || 500;
    return res.status(status).json({ error: e?.message || 'INTERNAL_ERROR' });
  }
}

