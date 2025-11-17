import { z } from 'zod';

export const enviarSolicitudSchema = z.object({
  body: z.object({
    receptorId: z.string().min(1)
  })
});

export const idSolicitudParamsSchema = z.object({
  params: z.object({
    solicitudId: z.string().uuid()
  })
});

export const amigoIdParamsSchema = z.object({
  params: z.object({
    amigoId: z.string().uuid()
  })
});

