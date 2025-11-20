import { z } from 'zod';

export const crearGrupoSchema = z.object({
  body: z.object({
    nombre: z.string().min(1).max(120),
    descripcion: z.string().max(400).optional(),
    initialMembers: z.array(z.string().uuid()).min(1).optional()
  })
});

export const grupoIdParamsSchema = z.object({
  params: z.object({
    grupoId: z.string().uuid()
  })
});

export const crearInviteLinkSchema = z.object({
  params: z.object({ grupoId: z.string().uuid() }),
  body: z.object({
    expiresInMinutes: z.number().int().min(5).max(60 * 24).optional()
  }).optional()
});

export const joinByInviteSchema = z.object({
  body: z.object({
    inviteId: z.string().min(20),
    groupId: z.string().uuid()
  })
});

export const addMembersSchema = z.object({
  params: z.object({ grupoId: z.string().uuid() }),
  body: z.object({ memberIds: z.array(z.string().uuid()).min(1) })
});

export const actualizarGrupoSchema = z.object({
  params: z.object({
    grupoId: z.string().uuid()
  }),
  body: z.object({
    nombre: z.string().min(1).max(120).optional(),
    descripcion: z.string().max(400).optional()
  })
});