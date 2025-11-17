import { Request, Response } from 'express';
import { AuthRequest } from '../../middlewares/auth';
import * as svc from './grupos.service';

export async function crearGrupo(req: Request, res: Response) {
  try {
    const firebaseUid = (req as AuthRequest).user?.uid;
    if (!firebaseUid) return res.status(401).json({ error: 'UNAUTHORIZED' });
    const { nombre, descripcion, initialMembers } = req.body as { nombre: string; descripcion?: string; initialMembers?: string[] };
    const result = await svc.crearGrupo({ firebaseUid, nombre, descripcion, initialMembers });
    return res.status(201).json(result);
  } catch (e: any) {
    const status = e?.status || 500;
    return res.status(status).json({ error: e?.message || 'INTERNAL_ERROR' });
  }
}

export async function obtenerMisGrupos(req: Request, res: Response) {
  try {
    const firebaseUid = (req as AuthRequest).user?.uid;
    if (!firebaseUid) return res.status(401).json({ error: 'UNAUTHORIZED' });
    const rows = await svc.obtenerMisGrupos({ firebaseUid });
    return res.json(rows);
  } catch (e: any) {
    const status = e?.status || 500;
    return res.status(status).json({ error: e?.message || 'INTERNAL_ERROR' });
  }
}

export async function obtenerMiembros(req: Request, res: Response) {
  try {
    const firebaseUid = (req as AuthRequest).user?.uid;
    if (!firebaseUid) return res.status(401).json({ error: 'UNAUTHORIZED' });
    const { grupoId } = (req as any).validated?.params || req.params;
    const rows = await svc.obtenerMiembros({ firebaseUid, grupoId });
    return res.json(rows);
  } catch (e: any) {
    const status = e?.status || 500;
    return res.status(status).json({ error: e?.message || 'INTERNAL_ERROR' });
  }
}

export async function unirseAGrupo(req: Request, res: Response) {
  try {
    const firebaseUid = (req as AuthRequest).user?.uid;
    if (!firebaseUid) return res.status(401).json({ error: 'UNAUTHORIZED' });
    const { grupoId } = (req as any).validated?.params || req.params;
    const result = await svc.unirseAGrupo({ firebaseUid, grupoId });
    return res.json(result);
  } catch (e: any) {
    const status = e?.status || 500;
    return res.status(status).json({ error: e?.message || 'INTERNAL_ERROR' });
  }
}

export async function crearInviteLink(req: Request, res: Response) {
  try {
    const firebaseUid = (req as AuthRequest).user?.uid;
    if (!firebaseUid) return res.status(401).json({ error: 'UNAUTHORIZED' });
    const { grupoId } = (req as any).validated?.params || req.params;
    const { expiresInMinutes } = ((req as any).validated?.body || req.body) as { expiresInMinutes?: number };
    const result = await svc.crearInviteLink({ firebaseUid, grupoId, expiresInMinutes });
    return res.json(result);
  } catch (e: any) {
    const status = e?.status || 500;
    return res.status(status).json({ error: e?.message || 'INTERNAL_ERROR' });
  }
}

export async function joinByInvite(req: Request, res: Response) {
  try {
    const firebaseUid = (req as AuthRequest).user?.uid;
    if (!firebaseUid) return res.status(401).json({ error: 'UNAUTHORIZED' });
    const { inviteId, groupId } = (req as any).validated?.body || req.body;
    const result = await svc.joinByInvite({ firebaseUid, inviteId, grupoId: groupId });
    return res.json(result);
  } catch (e: any) {
    const status = e?.status || 500;
    return res.status(status).json({ error: e?.message || 'INTERNAL_ERROR' });
  }
}

export async function addMembers(req: Request, res: Response) {
  try {
    const firebaseUid = (req as AuthRequest).user?.uid;
    if (!firebaseUid) return res.status(401).json({ error: 'UNAUTHORIZED' });
    const { grupoId } = (req as any).validated?.params || req.params;
    const { memberIds } = (req as any).validated?.body || req.body;
    const result = await svc.addMembers({ firebaseUid, grupoId, memberIds });
    return res.json(result);
  } catch (e: any) {
    const status = e?.status || 500;
    return res.status(status).json({ error: e?.message || 'INTERNAL_ERROR' });
  }
}

export async function obtenerBalance(req: Request, res: Response) {
  try {
    const firebaseUid = (req as AuthRequest).user?.uid;
    if (!firebaseUid) return res.status(401).json({ error: 'UNAUTHORIZED' });
    const { grupoId } = (req as any).validated?.params || req.params;
    const rows = await svc.obtenerBalance({ firebaseUid, grupoId });
    return res.json(rows);
  } catch (e: any) {
    const status = e?.status || 500;
    return res.status(status).json({ error: e?.message || 'INTERNAL_ERROR' });
  }
}

// 🆕 NUEVAS FUNCIONES DE CONFIGURACIÓN

export async function actualizarGrupo(req: Request, res: Response) {
  try {
    const firebaseUid = (req as AuthRequest).user?.uid;
    if (!firebaseUid) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const { grupoId } = (req as any).validated?.params || req.params;
    const { nombre, descripcion } = req.body;

    const result = await svc.actualizarGrupo({
      firebaseUid,
      grupoId,
      nombre,
      descripcion,
    });

    return res.json(result);
  } catch (e: any) {
    const status = e?.status || 500;
    return res.status(status).json({ error: e?.message || 'INTERNAL_ERROR' });
  }
}

export async function eliminarMiembro(req: Request, res: Response) {
  try {
    const firebaseUid = (req as AuthRequest).user?.uid;
    if (!firebaseUid) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const { grupoId, usuarioId } = req.params;

    const result = await svc.eliminarMiembro({
      firebaseUid,
      grupoId,
      usuarioId,
    });

    return res.json(result);
  } catch (e: any) {
    const status = e?.status || 500;
    return res.status(status).json({ error: e?.message || 'INTERNAL_ERROR' });
  }
}

export async function cambiarRolMiembro(req: Request, res: Response) {
  try {
    const firebaseUid = (req as AuthRequest).user?.uid;
    if (!firebaseUid) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const { grupoId, usuarioId } = req.params;
    const { rol } = req.body;

    const result = await svc.cambiarRolMiembro({
      firebaseUid,
      grupoId,
      usuarioId,
      rol,
    });

    return res.json(result);
  } catch (e: any) {
    const status = e?.status || 500;
    return res.status(status).json({ error: e?.message || 'INTERNAL_ERROR' });
  }
}


export async function eliminarGrupo(req: Request, res: Response) {
  try {
    const firebaseUid = (req as AuthRequest).user?.uid;
    if (!firebaseUid) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const { grupoId } = (req as any).validated?.params || req.params;

    const result = await svc.eliminarGrupo({
      firebaseUid,
      grupoId,
    });

    return res.json(result);
  } catch (e: any) {
    const status = e?.status || 500;
    return res.status(status).json({ error: e?.message || 'INTERNAL_ERROR' });
  }
}