import { z } from 'zod';

export const syncUserSchema = z.object({
  body: z.object({
    nombre: z.string().min(1).max(120),
    fechaNacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe ser YYYY-MM-DD'),

    // 🔥 FIX: Faltaban estos campos.
    // El validador los estaba borrando del body.
    clave_pago: z.string().min(1).max(50).optional().nullable(),
    foto_data: z.string().optional().nullable(),
  }),

  // Añadimos esto para asegurar que el validadMlor no falle
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

// Los otros schemas (register, login) se quedan igual
export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(8, 'Contraseña debe tener al menos 8 caracteres'),
    nombre: z.string().min(1).max(120),
    fechaNacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe ser YYYY-MM-DD'),
    clave_pago: z.string().min(1).max(50), // Hacemos que sea requerido en el registro legacy?
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'Contraseña no puede estar vacía'),
  })
});