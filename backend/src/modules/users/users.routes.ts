import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { updateMeSchema } from './users.schemas';
import * as ctrl from './users.controller';

const r = Router();

// Public check for alias/CVU availability
r.get('/clave-available', ctrl.checkClaveAvailable);

r.get('/me', requireAuth, ctrl.getMe);
r.put('/me', requireAuth, validate(updateMeSchema), ctrl.updateMe);
// Buscar usuario por email (p. ej. para invitar/agregar amigos)
// Ejemplo: GET /users/search?email=correo@dominio.com
r.get('/search', requireAuth, ctrl.findByEmail);

export default r;