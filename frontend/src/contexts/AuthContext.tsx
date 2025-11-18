import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
  useMemo,
  useCallback,
} from 'react';
import { auth } from '../config/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
  sendEmailVerification,
  deleteUser,
} from 'firebase/a'uth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as client from '../api/client'; // Importamos el cliente de API
import { useProfile } from './ProfileContext'; // Importamos el ProfileContext

// Definición del tipo de contexto
interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isVerifying: boolean;
  isSyncing: boolean;

  // Esta es la firma de función que usa tu CrearCuenta.tsx
  register: (
    email: string,
    pass: string,
    nombre: string,
    fechaNacimiento: string, // YYYY-MM-DD
    clavePago: string,
    fotoBase64: string | null
  ) => Promise<void>;

  signIn: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_VERIFIED_KEY = '@user_verified';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Carga inicial
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Esto causaba el error 'useProfile must be used within a ProfileProvider'
  // Asegúrate de que en App.js, <ProfileProvider> envuelva a <AuthProvider>
  const { setProfileImage } = useProfile();

  const setVerifiedFlag = async (val: boolean) => {
    try {
      await AsyncStorage.setItem(USER_VERIFIED_KEY, JSON.stringify(val));
    } catch (e) {
      console.error('Failed to save verified flag', e);
    }
  };

  const checkVerifiedFlag = async () => {
    try {
      const val = await AsyncStorage.getItem(USER_VERIFIED_KEY);
      return val ? JSON.parse(val) : false;
    } catch (e) {
      return false;
    }
  };

  const handleAuthChange = useCallback(async (firebaseUser: User | null) => {
    setLoading(true);
    setError(null);
    if (firebaseUser) {
      await firebaseUser.reload(); // Refrescar estado de Firebase

      if (firebaseUser.emailVerified) {
        setUser(firebaseUser);
        setIsVerifying(false);
        await setVerifiedFlag(true);
        try {
          const token = await firebaseUser.getIdToken();
          client.setAuthToken(token);
        } catch (e) {
          console.error('No se pudo obtener el token para la API', e);
        }
      } else {
        const alreadyMarked = await checkVerifiedFlag();
        if (alreadyMarked) {
          console.warn('Usuario sigue sin verificar, pero se marcó localmente.');
          setUser(firebaseUser);
          setIsVerifying(false);
        } else {
          setUser(null);
          setIsVerifying(true);
        }
      }
    } else {
      setUser(null);
      setIsVerifying(false);
      client.setAuthToken(undefined);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, handleAuthChange);
    return unsubscribe;
  }, [handleAuthChange]);


  // Esta es la función register() que usa tu CrearCuenta.tsx
  const register = async (
    email: string,
    pass: string,
    nombre: string,
    fechaNacimiento: string, // YYYY-MM-DD
    clavePago: string,
    fotoBase64: string | null
  ) => {
    setLoading(true);
    setIsSyncing(true);
    setError(null);
    let createdFirebaseUser: User | null = null;

    try {
      // 1. Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      createdFirebaseUser = userCredential.user;
      console.log('✅ Usuario creado en Firebase');

      // 2. Sincronizar con el backend (Base de Datos SQL)
      try {
        const token = await createdFirebaseUser.getIdToken();
        client.setAuthToken(token);
        console.log('🔄 Sincronizando con backend...');

        // Llamamos al cliente de la API
        const backendUser = await client.syncUserWithBackend({
          nombre: nombre,
          fechaNacimiento: fechaNacimiento,

          // 🔥 FIX: Aquí estaba el error. Faltaba pasar la clave_pago.
          clave_pago: clavePago,

          foto_data: fotoBase64,
        });

        console.log('✅ Sincronización con backend exitosa');

        // Actualizar foto en ProfileContext si el backend la devolvió
        if (backendUser?.foto_url) {
          setProfileImage(backendUser.foto_url);
        }

      } catch (syncError: any) {
        console.error('❌ Error en syncUserWithBackend:', syncError.message);
        // Si falla el sync, borrar el usuario de Firebase para reintentar
        if (createdFirebaseUser) {
          console.log('🗑️ Eliminando usuario de Firebase por fallo en sincronización...');
          await deleteUser(createdFirebaseUser);
          console.log('✅ Usuario eliminado de Firebase');
        }
        throw syncError; // Lanzar el error para que la UI lo atrape
      }

      // 3. Enviar email de verificación
      try {
        await sendEmailVerification(createdFirebaseUser);
        console.log('✉️ Email de verificación enviado');
      } catch (e) {
        console.warn('⚠️ No se pudo enviar el email de verificación', e);
      }

      await setVerifiedFlag(true);
      setUser(createdFirebaseUser);
      setIsVerifying(true); // Lo mandamos a la pantalla de "Verifica tu email"

    } catch (error: any) {
      console.error('❌ Error al crear cuenta:', error);
      let friendlyError = 'No se pudo crear la cuenta.';
      if (error.code === 'auth/email-already-in-use') {
        friendlyError = 'Este correo electrónico ya está en uso.';
      } else if (error.code === 'auth/weak-password') {
        friendlyError = 'La contraseña es muy débil (mínimo 6 caracteres).';
      } else if (error.message) {
        friendlyError = error.message;
      }
      setError(friendlyError);
      throw new Error(friendlyError);
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      return userCredential.user;
    } catch (error: any) {
      let friendlyError = 'Email o contraseña incorrectos.';
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        friendlyError = 'Email o contraseña incorrectos.';
      } else if (error.code === 'auth/too-many-requests') {
        friendlyError = 'Demasiados intentos. Intenta más tarde.';
      }
      setError(friendlyError);
      throw new Error(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      await AsyncStorage.clear();
      client.setAuthToken(undefined);
      setUser(null);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const resendVerificationEmail = async () => {
    if (auth.currentUser) {
      try {
        await sendEmailVerification(auth.currentUser);
        console.log('✉️ Email de verificación reenviado');
      } catch (e) {
        console.error('No se pudo reenviar email', e);
        throw e;
      }
    } else {
      throw new Error('No hay usuario logueado');
    }
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      isVerifying,
      isSyncing,
      register, // Exponemos la función 'register'
      signIn,
      logout,
      resendVerificationEmail,
    }),
    [user, loading, error, isVerifying, isSyncing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}