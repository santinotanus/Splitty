import { Router } from 'express';
import { requireAuthUnverified } from '../../middlewares/auth'; // 🔥 Cambiar a requireAuthUnverified
import { validate } from '../../middlewares/validate';
import { syncUserSchema } from './auth.schemas';
import * as ctrl from './auth.controller';

const r = Router();

// Sincronizar usuario de Firebase con nuestra base de datos
// 🔥 Usar requireAuthUnverified porque el usuario acaba de registrarse y aún no verificó el email
r.post('/sync-user', requireAuthUnverified, validate(syncUserSchema), ctrl.syncUser);

export default r;