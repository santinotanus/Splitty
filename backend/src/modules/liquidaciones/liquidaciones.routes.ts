import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import * as ctrl from './liquidaciones.controller';
import { crearLiquidacionSchema, groupIdParamsSchema } from './liquidaciones.schemas';

const r = Router();

r.post('/settlements', requireAuth, validate(crearLiquidacionSchema), ctrl.crearLiquidacion);
r.get('/settlements', requireAuth, validate(groupIdParamsSchema), ctrl.listarLiquidaciones);

export default r;

