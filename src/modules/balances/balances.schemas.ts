import { z } from 'zod';

export const groupIdParamsSchema = z.object({
  params: z.object({
    groupId: z.string().uuid()
  })
});

export const uploadReceiptSchema = z.object({
  params: z.object({
    groupId: z.string().uuid()
  }),
  body: z.object({
    deudorId: z.string().uuid(),
    acreedorId: z.string().uuid(),
    filename: z.string().optional(),
    // Either provide `data` (base64 image) for server-side upload OR `url`
    // when the client uploads directly to Cloudinary (unsigned) and sends
    // back the resulting URL. We enforce at least one is present via refine.
    data: z.string().optional(),
    url: z.string().url().optional()
  })
});

// Ensure that at least one of data or url is present
export const uploadReceiptSchemaValidated = uploadReceiptSchema.refine(
  (v) => !!(v.body.data || v.body.url),
  { message: 'Either data (base64) or url must be provided in body' }
);

