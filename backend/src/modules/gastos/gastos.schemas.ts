import { z } from 'zod';

export const crearGastoSchema = z.object({
  params: z.object({
    groupId: z.string().uuid()
  }),
  body: z.object({
    pagadorId: z.string().uuid(),
    descripcion: z.string().max(300).optional(),
    importe: z.number().positive(),
    lugar: z.string().max(200).optional(),
    fecha_pago: z.string().datetime().optional(),
    participantes: z.array(
      z.object({
        usuarioId: z.string().uuid(),
        parte_importe: z.number().nonnegative().optional(),
        parte_porcentaje: z.number().min(0).max(100).optional()
      }).refine(
        (data) => data.parte_importe !== undefined || data.parte_porcentaje !== undefined,
        { message: 'Debe especificar parte_importe o parte_porcentaje' }
      )
    ).min(1)
  })
});

export const grupoIdParamsSchema = z.object({
  params: z.object({
    groupId: z.string().uuid()
  })
});

export const gastoIdParamsSchema = z.object({
  params: z.object({
    groupId: z.string().uuid(),
    expenseId: z.string().uuid()
  })
});

export const listarGastosQuerySchema = z.object({
  params: z.object({
    groupId: z.string().uuid()
  }),
  // Hacemos la sección `query` opcional y parcial, de modo que no falle
  // cuando la request no incluya parámetros de paginación/fechas.
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    fechaDesde: z.string().datetime().optional(),
    fechaHasta: z.string().datetime().optional()
  }).partial().optional()
});

