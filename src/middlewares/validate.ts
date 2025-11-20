import { ZodTypeAny, ZodError } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const validate = (schema: ZodTypeAny) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse({ body: req.body, params: req.params, query: req.query }) as {
        body: Request['body'];
        params: Request['params'];
        query: Request['query'];
      };
      // It's safe to replace `req.body` (body-parser sets it). However, some
      // Express `Request` properties like `params` and `query` may be getters or
      // otherwise not assignable at runtime in some setups. To avoid the
      // "Cannot set property ... which has only a getter" error we don't
      // overwrite them directly. Instead attach the validated values under a
      // custom `validated` property. Controllers can keep using `req.body` and
      // can access `req.validated.params` / `req.validated.query` if needed.
      req.body = parsed.body;
      (req as any).validated = { params: parsed.params, query: parsed.query, body: parsed.body };
      next();
    } catch (e) {
      // Zod v4 provides the `errors` array on ZodError.
      // Avoid calling `flatten()` which may not exist depending on zod version.
      if (e instanceof ZodError) {
        const zerr = e as ZodError;
        return res.status(400).json({ error: 'VALIDATION_ERROR', issues: zerr.issues });
      }
      // Fallback for other errors
      return res.status(400).json({ error: 'VALIDATION_ERROR', issues: String(e) });
    }
  };