import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { setAuthToken, syncUserWithBackend } from "../api/client";

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  register: (email: string, password: string, nombre: string, fechaNacimiento: string, clavePago?: string) => Promise<User>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 🔥 Listener de cambios de autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔄 Auth state changed:', firebaseUser?.email);

      // Solo establecer el usuario si su email está verificado
      if (firebaseUser && firebaseUser.emailVerified) {
        console.log('✅ Usuario con email verificado');
        setUser(firebaseUser);

        try {
          const idToken = await firebaseUser.getIdToken();
          console.log('🔑 Token obtenido, longitud:', idToken.length);
          setToken(idToken);
          setAuthToken(idToken);
          // Verificar que el usuario exista en el backend; si no, cerrar sesión local
          try {
            // importar la función getCurrentUser de forma dinámica para evitar dependencias circulares
            const { getCurrentUser } = await import('../api/client');
            await getCurrentUser();
          } catch (err: any) {
            // Si el backend responde 404 o devuelve USER_NOT_FOUND, cerramos la sesión local
            const message = err?.response?.data || err?.message || String(err);
            console.warn('⚠️ Verificación backend fallo:', message);
            // Condiciones típicas: 404 con { error: 'USER_NOT_FOUND' }
            const isUserNotFound = err?.response?.status === 404 || (err?.response?.data?.error === 'USER_NOT_FOUND');
            if (isUserNotFound) {
              console.log('🚪 Usuario no encontrado en backend — cerrando sesión local');
              try {
                await signOut(auth);
              } catch (e) {
                console.warn('❌ Error al cerrar sesión local:', e);
              }
              setUser(null);
              setToken(null);
              setAuthToken(undefined);
            }
          }
        } catch (error) {
          console.error('❌ Error obteniendo token:', error);
        }
      } else {
        console.log('❌ Usuario sin verificar o no autenticado');
        setUser(null);
        setToken(null);
        setAuthToken(undefined);
      }

      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  // 📝 REGISTRO
  const register = async (
    email: string,
    password: string,
    nombre: string,
    fechaNacimiento: string,
    clavePago?: string
  ): Promise<User> => {
    let userCredential;

    try {
      console.log('📝 Iniciando registro...');
      console.log('Email:', email);
      console.log('Nombre:', nombre);
      console.log('Fecha:', fechaNacimiento);

      // 1. Crear usuario en Firebase
      console.log('1️⃣ Creando usuario en Firebase...');
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('✅ Usuario creado en Firebase:', userCredential.user.uid);

      // 2. Obtener token
      console.log('2️⃣ Obteniendo token...');
      const idToken = await userCredential.user.getIdToken();
      console.log('✅ Token obtenido');
      setAuthToken(idToken);

      // 3. Sincronizar con backend
      console.log('3️⃣ Sincronizando con backend...');
      await syncUserWithBackend({
        nombre,
        fechaNacimiento,
        clave_pago: clavePago ?? null
      });
      console.log('✅ Sincronización exitosa');

      // 4. Enviar email de verificación
      console.log('4️⃣ Enviando email de verificación...');
      await sendEmailVerification(userCredential.user);
      console.log('✅ Email de verificación enviado');

      // 5. 🔥 CERRAR SESIÓN INMEDIATAMENTE
      console.log('5️⃣ Cerrando sesión hasta que verifique el email...');
      await signOut(auth);
      console.log('✅ Sesión cerrada');

      return userCredential.user;

    } catch (error: any) {
      console.error('❌ Error en registro:', error);

      // Si el usuario fue creado en Firebase pero falló la sincronización
      if (userCredential && userCredential.user) {
        try {
          console.log('🗑️ Eliminando usuario de Firebase por fallo en sincronización...');
          await userCredential.user.delete();
          console.log('✅ Usuario eliminado de Firebase');
        } catch (deleteError) {
          console.error('❌ No se pudo eliminar el usuario de Firebase:', deleteError);
        }
      }

      throw error;
    }
  };

  // 🔐 LOGIN
  const login = async (email: string, password: string) => {
    console.log('🔐 Iniciando login...');
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    // 🔥 Verificar que el email esté verificado
    if (!userCredential.user.emailVerified) {
      console.log('❌ Email no verificado');
      await signOut(auth); // Cerrar sesión inmediatamente
      throw new Error('EMAIL_NOT_VERIFIED');
    }

    console.log('✅ Login exitoso con email verificado');
  };

  // 🚪 LOGOUT
  const logout = async () => {
    console.log('🚪 Cerrando sesión...');
    await signOut(auth);
  };

  // 🔄 REENVIAR VERIFICACIÓN
  const resendVerification = async () => {
    if (!user) throw new Error('NO_USER');
    await sendEmailVerification(user);
  };

  // 🔑 RESETEAR CONTRASEÑA
  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        register,
        login,
        logout,
        resetPassword,
        resendVerification
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export default AuthContext;