import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import * as ctrl from './amigos.controller';
import { enviarSolicitudSchema, idSolicitudParamsSchema } from './amigos.schemas';

const r = Router();

r.post('/solicitudes', requireAuth, validate(enviarSolicitudSchema), ctrl.enviarSolicitud);
r.get('/solicitudes/recibidas', requireAuth, ctrl.listarPendientesRecibidas);
r.post('/solicitudes/:solicitudId/aceptar', requireAuth, validate(idSolicitudParamsSchema), ctrl.aceptarSolicitud);
r.post('/solicitudes/:solicitudId/rechazar', requireAuth, validate(idSolicitudParamsSchema), ctrl.rechazarSolicitud);
r.get('/', requireAuth, ctrl.listarAmigos);

export default r;


