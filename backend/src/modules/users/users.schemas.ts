import { z } from 'zod';

export const updateMeSchema = z.object({
  body: z.object({
    nombre: z.string().min(1).max(120).optional(),
    clave_pago: z.string().min(1).max(50).optional()
  })
});