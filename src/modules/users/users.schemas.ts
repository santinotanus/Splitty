import { z } from 'zod';

export const updateMeSchema = z.object({
  body: z.object({
    nombre: z.string().min(1).max(120).optional(),
    clave_pago: z.string().min(1).max(50).optional().nullable(),
    foto_data: z.string().optional().nullable(),
    foto_url: z.string().url().optional().nullable()
  }),

  params: z.object({}).optional(),
  query: z.object({}).optional(),
});