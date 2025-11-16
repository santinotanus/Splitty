import { z } from 'zod';

export const groupIdParamsSchema = z.object({
  params: z.object({
    groupId: z.string().uuid()
  })
});

