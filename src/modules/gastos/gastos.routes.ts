import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import * as ctrl from './gastos.controller';
import { crearGastoSchema, gastoIdParamsSchema, listarGastosQuerySchema } from './gastos.schemas';

// Necesitamos que este router herede los params de la ruta padre (por ejemplo groupId)
// porque en app.ts montamos este router con `app.use('/groups/:groupId/expenses', gastosRoutes)`.
// Sin `mergeParams: true`, `req.params.groupId` queda undefined dentro del router.
const r = Router({ mergeParams: true });

r.post('/', requireAuth, validate(crearGastoSchema), ctrl.crearGasto);
r.get('/', requireAuth, validate(listarGastosQuerySchema), ctrl.listarGastos);
r.get('/:expenseId', requireAuth, validate(gastoIdParamsSchema), ctrl.obtenerGasto);

export default r;

