import { z } from 'zod';

export const updateMeSchema = z.object({
  body: z.object({
    nombre: z.string().min(1).max(120)
  })
});