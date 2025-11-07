import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { updateMeSchema } from './users.schemas';
import * as ctrl from './users.controller';

const r = Router();

r.get('/me', requireAuth, ctrl.getMe);
r.put('/me', requireAuth, validate(updateMeSchema), ctrl.updateMe);

export default r;