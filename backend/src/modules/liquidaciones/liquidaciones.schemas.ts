import { z } from 'zod';

export const crearLiquidacionSchema = z.object({
  params: z.object({
    groupId: z.string().uuid()
  }),
  body: z.object({
    desde_usuario: z.string().uuid(),
    hacia_usuario: z.string().uuid(),
    importe: z.number().positive(),
    fecha_pago: z.string().date()
  }).refine(
    (data) => data.desde_usuario !== data.hacia_usuario,
    { message: 'desde_usuario y hacia_usuario deben ser diferentes' }
  )
});

export const groupIdParamsSchema = z.object({
  params: z.object({
    groupId: z.string().uuid()
  })
});

