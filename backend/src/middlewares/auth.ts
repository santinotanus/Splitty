import { Request, Response, NextFunction } from 'express';
import { auth as firebaseAuth } from '../config/firebase-admin';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    emailVerified: boolean;
  };
}

// Middleware que requiere email verificado
export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'No se proporcionó token de autenticación'
      });
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = await firebaseAuth.verifyIdToken(token);

    // ✅ Verificar que el email esté verificado
    if (!decodedToken.email_verified) {
      return res.status(403).json({
        error: 'EMAIL_NOT_VERIFIED',
        message: 'Por favor verifica tu correo electrónico antes de acceder'
      });
    }

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified
    };

    console.log('✅ Usuario autenticado:', req.user.email);
    return next();
  } catch (err: any) {
    console.error('❌ Error en autenticación:', err.code || err.message);

    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({
        error: 'TOKEN_EXPIRED',
        message: 'El token ha expirado. Por favor inicia sesión nuevamente.'
      });
    }

    if (err.code === 'auth/argument-error') {
      return res.status(401).json({
        error: 'INVALID_TOKEN',
        message: 'Formato de token inválido'
      });
    }

    if (err.code === 'auth/id-token-revoked') {
      return res.status(401).json({
        error: 'TOKEN_REVOKED',
        message: 'El token ha sido revocado'
      });
    }

    return res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Falló la verificación del token'
    });
  }
};

// 🆕 Middleware que NO requiere email verificado (para sync-user)
export const requireAuthUnverified = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'No se proporcionó token de autenticación'
      });
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = await firebaseAuth.verifyIdToken(token);

    // ⚠️ NO verificamos email_verified aquí
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: !!decodedToken.email_verified // Ensures boolean type
    };

    console.log('✅ Usuario autenticado (sin verificar email):', req.user?.email);
    return next();
  } catch (err: any) {
    console.error('❌ Error en autenticación:', err.code || err.message);

    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({
        error: 'TOKEN_EXPIRED',
        message: 'El token ha expirado. Por favor inicia sesión nuevamente.'
      });
    }

    return res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Falló la verificación del token'
    });
  }
};