import { initializeApp } from 'firebase/app';
// 🔥 1. Cambiamos 'getAuth' por 'initializeAuth' y 'getReactNativePersistence'
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';
// 🔥 2. Importamos AsyncStorage (ya lo tenés instalado)
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyBA-LCc-LBjbTuv2Uw3v4UpOm-yzIhtOWg",
  authDomain: "splitty-102b4.firebaseapp.com",
  projectId: "splitty-102b4",
  storageBucket: "splitty-102b4.firebasestorage.app",
  messagingSenderId: "616662074521",
  appId: "1:616662074521:web:c8dd41c8cf51fadc912408"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// 🔥 3. Configurar Auth con persistencia
// Esto le dice a Firebase que guarde el token en el almacenamiento
// del teléfono para que la sesión no se cierre.
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Configurar Firestore
const db = getFirestore(app);

// Configurar Storage
const storage = getStorage(app);

export { auth, db, storage };
export default app;