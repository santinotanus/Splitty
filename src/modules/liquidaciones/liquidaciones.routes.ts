import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import * as ctrl from './liquidaciones.controller';
import { crearLiquidacionSchema, groupIdParamsSchema } from './liquidaciones.schemas';

// Router must inherit parent params (groupId) when mounted at '/groups/:groupId'
const r = Router({ mergeParams: true });

r.post('/settlements', requireAuth, validate(crearLiquidacionSchema), ctrl.crearLiquidacion);
r.get('/settlements', requireAuth, validate(groupIdParamsSchema), ctrl.listarLiquidaciones);

export default r;

