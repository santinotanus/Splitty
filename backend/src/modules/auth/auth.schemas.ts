import { z } from 'zod';

// Esquema para sincronizar usuario de Firebase con nuestra DB
export const syncUserSchema = z.object({
  body: z.object({
    nombre: z.string().min(1).max(120),
    fechaNacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato debe ser YYYY-MM-DD')
  })
});