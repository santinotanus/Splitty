import { z } from 'zod';

export const enviarSolicitudSchema = z.object({
  body: z.object({
    receptorId: z.string().uuid()
  })
});

export const idSolicitudParamsSchema = z.object({
  params: z.object({
    solicitudId: z.string().uuid()
  })
});


