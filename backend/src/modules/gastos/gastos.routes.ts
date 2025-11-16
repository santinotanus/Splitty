import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import * as ctrl from './gastos.controller';
import { crearGastoSchema, gastoIdParamsSchema, listarGastosQuerySchema } from './gastos.schemas';

const r = Router();

r.post('/', requireAuth, validate(crearGastoSchema), ctrl.crearGasto);
r.get('/', requireAuth, validate(listarGastosQuerySchema), ctrl.listarGastos);
r.get('/:expenseId', requireAuth, validate(gastoIdParamsSchema), ctrl.obtenerGasto);

export default r;

