import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import * as ctrl from './grupos.controller';
import { crearGrupoSchema, grupoIdParamsSchema, crearInviteLinkSchema, joinByInviteSchema, addMembersSchema } from './grupos.schemas';

const r = Router();

r.post('/', requireAuth, validate(crearGrupoSchema), ctrl.crearGrupo);
r.get('/', requireAuth, ctrl.obtenerMisGrupos);
r.get('/:grupoId/miembros', requireAuth, validate(grupoIdParamsSchema), ctrl.obtenerMiembros);
r.post('/:grupoId/join', requireAuth, validate(grupoIdParamsSchema), ctrl.unirseAGrupo);
r.post('/:grupoId/invite-link', requireAuth, validate(crearInviteLinkSchema), ctrl.crearInviteLink);
r.post('/join-by-invite', requireAuth, validate(joinByInviteSchema), ctrl.joinByInvite);
r.post('/:grupoId/add-members', requireAuth, validate(addMembersSchema), ctrl.addMembers);

export default r;


