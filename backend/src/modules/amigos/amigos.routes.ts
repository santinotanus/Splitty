import { Router } from 'express';
import { requireAuthUnverified } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import * as ctrl from './amigos.controller';
import { enviarSolicitudSchema, idSolicitudParamsSchema } from './amigos.schemas';

const r = Router();

r.post('/solicitudes', requireAuthUnverified, validate(enviarSolicitudSchema), ctrl.enviarSolicitud);
r.get('/solicitudes/recibidas', requireAuthUnverified, ctrl.listarPendientesRecibidas);
r.post('/solicitudes/:solicitudId/aceptar', requireAuthUnverified, validate(idSolicitudParamsSchema), ctrl.aceptarSolicitud);
r.post('/solicitudes/:solicitudId/rechazar', requireAuthUnverified, validate(idSolicitudParamsSchema), ctrl.rechazarSolicitud);
r.get('/', requireAuthUnverified, ctrl.listarAmigos);

export default r;


