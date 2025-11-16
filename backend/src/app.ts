import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import './config/firebase-admin';

import usersRoutes from './modules/users/users.routes';
import authRoutes from './modules/auth/auth.routes';
import amigosRoutes from './modules/amigos/amigos.routes';
import gruposRoutes from './modules/grupos/grupos.routes';
import gastosRoutes from './modules/gastos/gastos.routes';
import balancesRoutes from './modules/balances/balances.routes';
import liquidacionesRoutes from './modules/liquidaciones/liquidaciones.routes';


const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true }));
app.use(express.json());

app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err && err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'INVALID_JSON', message: err.message });
  }
  return next(err);
});

app.get('/health', (req, res) => {
  console.log('✅ Health check recibido desde:', req.ip);
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path} desde ${req.ip}`);
  next();
});

// Routes
app.use('/users', usersRoutes);
app.use('/auth', authRoutes);
app.use('/amigos', amigosRoutes);
app.use('/grupos', gruposRoutes);
app.use('/groups/:groupId/expenses', gastosRoutes);
app.use('/groups/:groupId', balancesRoutes);
app.use('/groups/:groupId', liquidacionesRoutes);


app.use((req, res) => {
  console.log(`❌ 404 Not Found: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'NOT_FOUND', path: req.path });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Error:', err);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
});

export default app;