import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import * as ctrl from './balances.controller';
import { groupIdParamsSchema } from './balances.schemas';

const r = Router();

r.get('/my/balance', requireAuth, validate(groupIdParamsSchema), ctrl.obtenerMiBalance);
r.get('/my/debts', requireAuth, validate(groupIdParamsSchema), ctrl.obtenerMisDeudas);
r.get('/my/credits', requireAuth, validate(groupIdParamsSchema), ctrl.obtenerMisCreditos);
r.get('/summary', requireAuth, validate(groupIdParamsSchema), ctrl.obtenerResumen);

export default r;

