import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import * as ctrl from './balances.controller';
import { groupIdParamsSchema } from './balances.schemas';

// Router must inherit parent params (groupId) when mounted at '/groups/:groupId'
const r = Router({ mergeParams: true });

r.get('/my/balance', requireAuth, validate(groupIdParamsSchema), ctrl.obtenerMiBalance);
r.get('/my/debts', requireAuth, validate(groupIdParamsSchema), ctrl.obtenerMisDeudas);
r.get('/my/credits', requireAuth, validate(groupIdParamsSchema), ctrl.obtenerMisCreditos);
r.get('/summary', requireAuth, validate(groupIdParamsSchema), ctrl.obtenerResumen);

export default r;

